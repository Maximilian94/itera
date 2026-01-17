import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ExamQuestionDto,
  ExamQuestionsResponseDto,
} from './dto/exam-questions.response';
import { Exam, ExamInProgress } from '@domain/exam/exam.interface';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExams(input: { userId: string }) {
    const exams = await this.prisma.exam.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        questionCount: true,
        attempts: {
          select: { questionId: true, selectedOptionId: true },
        },
        questions: {
          select: {
            question: {
              select: {
                options: true,
                id: true,
              },
            },
          },
        },
      },
    });

    return {
      exams: exams.map((e) => {
        const questions = e.questions.map((q) => q.question);
        const attempts = e.attempts;
        const correct = new Set(
          attempts.filter((a) => {
            return (
              a.selectedOptionId &&
              questions
                .find((q) => q.id === a.questionId)
                ?.options.find((o) => o.id === a.selectedOptionId)?.isCorrect
            );
          }),
        );

        const attempted = new Set(e.attempts.map((a) => a.questionId));
        const correctCount = correct.size;
        const attemptedCount = attempted.size;
        const incorrectCount = Math.max(0, attemptedCount - correctCount);
        const unansweredCount = Math.max(0, e.questionCount - attemptedCount);

        return {
          id: e.id,
          createdAt: e.createdAt,
          startedAt: e.startedAt,
          finishedAt: e.finishedAt,
          status: this.toExamStatus(e),
          questionCount: e.questionCount,
          correctCount,
          incorrectCount,
          unansweredCount,
        };
      }),
    };
  }

  async createExam(input: {
    userId: string;
    skillIds?: string[];
    onlyUnsolved?: boolean;
    questionCount?: number;
  }): Promise<ExamQuestionsResponseDto> {
    const where: Prisma.QuestionWhereInput = {};

    if (input.skillIds?.length) where.skillId = { in: input.skillIds };

    if (input.onlyUnsolved) {
      where.AND = [
        { attempts: { some: { userId: input.userId } } },
        { attempts: { none: { userId: input.userId } } },
      ];
    }

    const count = input.questionCount ?? 10;
    const total = await this.prisma.question.count({ where });
    if (total < count)
      throw new BadRequestException(
        'not enough questions for requested filters',
      );

    // Random sampling via skip. This avoids loading all candidates into memory.
    // Tradeoff: large skips can be expensive on huge tables (OFFSET cost).
    const offsets = new Set<number>();
    while (offsets.size < count) offsets.add(Math.floor(Math.random() * total));

    const rows = await this.prisma.$transaction(
      [...offsets].map((skip) =>
        this.prisma.question.findMany({
          where,
          orderBy: { id: 'asc' },
          skip,
          take: 1,
          select: { id: true },
        }),
      ),
    );

    const chosen = rows.flat().map((r) => r.id);
    if (chosen.length < count)
      throw new BadRequestException(
        'not enough questions for requested filters',
      );

    const exam = await this.prisma.exam.create({
      data: {
        userId: input.userId,
        questionCount: count,
        onlyUnsolved: input.onlyUnsolved ?? false,
        filterSkillIds: input.skillIds ?? [],
        questions: {
          createMany: {
            data: chosen.map((questionId, idx) => ({
              questionId,
              order: idx + 1,
            })),
          },
        },
        attempts: {
          createMany: {
            data: chosen.map((questionId) => {
              return {
                userId: input.userId,
                questionId: questionId,
                selectedOptionId: undefined,
              };
            }),
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        questionCount: true,
      },
    });

    return this.getExamQuestions({ userId: input.userId, examId: exam.id });
  }

  async getExamQuestions(input: {
    userId: string;
    examId: string;
  }): Promise<ExamQuestionsResponseDto> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        questionCount: true,
      },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId)
      throw new ForbiddenException('exam does not belong to user');

    const rows = await this.prisma.examQuestion.findMany({
      where: { examId: input.examId },
      orderBy: { order: 'asc' },
      select: {
        order: true,
        question: {
          select: {
            id: true,
            statement: true,
            skillId: true,
            options: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, text: true },
            },
          },
        },
      },
    });

    const questionsBase: ExamQuestionDto[] = rows.map((r) => ({
      id: r.question.id,
      statement: r.question.statement,
      skillId: r.question.skillId,
      options: r.question.options.map((o) => ({ id: o.id, text: o.text })),
    }));

    const examDto = {
      id: exam.id,
      createdAt: exam.createdAt,
      startedAt: exam.startedAt,
      finishedAt: exam.finishedAt,
      status: this.toExamStatus(exam),
      questionCount: exam.questionCount,
    };

    return { exam: examDto, questions: questionsBase };
  }

  async startExam(input: {
    userId: string;
    examId: string;
  }): Promise<ExamInProgress> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, startedAt: true, finishedAt: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId)
      throw new ForbiddenException('exam does not belong to user');
    if (exam.finishedAt) throw new BadRequestException('exam already finished');
    if (exam.startedAt) {
      throw new BadRequestException('exam already started');
    }

    const examV2 = await this.prisma.exam.update({
      where: { id: input.examId },
      data: { startedAt: new Date() },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    return {
      id: examV2.id,
      createdAt: examV2.createdAt,
      questionCount: examV2.questionCount,
      status: 'in_progress',
      startedAt: examV2.startedAt!,
      finishedAt: null,
      questions: examV2.questions.map((q) => {
        return {
          id: q.questionId,
          statement: q.question.statement,
          options: q.question.options,
        };
      }),
    };
  }

  async finishExam(input: { userId: string; examId: string }): Promise<Exam> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, startedAt: true, finishedAt: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId)
      throw new ForbiddenException('exam does not belong to user');
    if (!exam.startedAt) throw new BadRequestException('exam not started');

    await this.prisma.exam.update({
      where: { id: input.examId },
      data: {
        finishedAt: new Date().toISOString(),
      },
    });

    return this.getExam({
      examId: input.examId,
      userId: input.userId,
    });
  }

  async getExamResults(input: { userId: string; examId: string }) {
    const base = await this.getExamQuestions(input);

    // status per question:
    // - correct: any correct attempt inside this exam
    // - incorrect: attempted but no correct attempt
    // - unanswered: no attempts
    const statusByQuestionId = new Map<
      string,
      'correct' | 'incorrect' | 'unanswered'
    >();

    const questions = base.questions.map((q) => ({
      ...q,
      status: statusByQuestionId.get(q.id) ?? 'unanswered',
    }));

    return {
      exam: {
        ...base.exam,
      },
      questions,
    };
  }

  async getExam(input: { userId: string; examId: string }): Promise<Exam> {
    const examFromDb = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    console.log(examFromDb);

    if (!examFromDb) throw new NotFoundException('exam not found');

    if (examFromDb.userId !== input.userId)
      throw new ForbiddenException('exam does not belong to user');

    if (!examFromDb.startedAt) {
      return {
        id: examFromDb.id,
        createdAt: examFromDb.createdAt,
        questionCount: examFromDb.questionCount,
        status: 'not_started',
        startedAt: null,
        finishedAt: null,
        // TODO
        questions: examFromDb.questions.map((q) => {
          return {
            id: q.questionId,
            statement: q.question.statement,
            options: q.question.options,
          };
        }),
      };
    }

    if (!examFromDb.finishedAt) {
      return {
        id: examFromDb.id,
        createdAt: examFromDb.createdAt,
        questionCount: examFromDb.questionCount,
        status: 'in_progress',
        startedAt: examFromDb.startedAt,
        finishedAt: null,
        // TODO
        questions: examFromDb.questions.map((q) => {
          return {
            id: q.questionId,
            statement: q.question.statement,
            options: q.question.options,
          };
        }),
      };
    }

    return {
      id: examFromDb.id,
      createdAt: examFromDb.createdAt,
      questionCount: examFromDb.questionCount,
      status: 'finished',
      startedAt: examFromDb.startedAt,
      finishedAt: examFromDb.finishedAt,
      // TODO
      questions: examFromDb.questions.map((q) => {
        return {
          id: q.questionId,
          statement: q.question.statement,
          options: q.question.options,
        };
      }),
    };
  }

  private toExamStatus(exam: {
    startedAt: Date | null;
    finishedAt: Date | null;
  }) {
    if (exam.finishedAt) return 'finished' as const;
    if (exam.startedAt) return 'in_progress' as const;
    return 'not_started' as const;
  }
}
