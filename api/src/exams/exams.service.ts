import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private toExamStatus(exam: { startedAt: Date | null; finishedAt: Date | null }) {
    if (exam.finishedAt) return 'finished' as const;
    if (exam.startedAt) return 'in_progress' as const;
    return 'not_started' as const;
  }

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
          select: { questionId: true, isCorrect: true },
        },
      },
    });

    return {
      exams: exams.map((e) => {
        const correct = new Set(e.attempts.filter((a) => a.isCorrect).map((a) => a.questionId));
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
  }) {
    const where: Prisma.QuestionWhereInput = {};

    if (input.skillIds?.length) where.skillId = { in: input.skillIds };

    if (input.onlyUnsolved) {
      where.AND = [
        { attempts: { some: { userId: input.userId } } },
        { attempts: { none: { userId: input.userId, isCorrect: true } } },
      ];
    }

    const count = input.questionCount ?? 10;
    const total = await this.prisma.question.count({ where });
    if (total < count) throw new BadRequestException('not enough questions for requested filters');

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
    if (chosen.length < count) throw new BadRequestException('not enough questions for requested filters');

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
      },
      select: { id: true, createdAt: true, startedAt: true, finishedAt: true, questionCount: true },
    });

    const questions = await this.getExamQuestions({
      userId: input.userId,
      examId: exam.id,
    });

    return {
      exam: { ...exam, status: this.toExamStatus(exam) },
      questions: questions.questions,
    };
  }

  async getExamQuestions(input: { userId: string; examId: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, createdAt: true, startedAt: true, finishedAt: true, questionCount: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId) throw new ForbiddenException('exam does not belong to user');

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

    return {
      exam: {
        id: exam.id,
        createdAt: exam.createdAt,
        startedAt: exam.startedAt,
        finishedAt: exam.finishedAt,
        status: this.toExamStatus(exam),
        questionCount: exam.questionCount,
      },
      questions: rows.map((r) => r.question),
    };
  }

  async startExam(input: { userId: string; examId: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, startedAt: true, finishedAt: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId) throw new ForbiddenException('exam does not belong to user');
    if (exam.finishedAt) throw new BadRequestException('exam already finished');
    if (exam.startedAt) {
      return { exam: { ...exam, status: this.toExamStatus(exam) } };
    }

    const updated = await this.prisma.exam.update({
      where: { id: input.examId },
      data: { startedAt: new Date() },
      select: { id: true, startedAt: true, finishedAt: true },
    });

    return { exam: { ...updated, status: this.toExamStatus(updated) } };
  }

  async finishExam(input: { userId: string; examId: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, startedAt: true, finishedAt: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId) throw new ForbiddenException('exam does not belong to user');
    if (!exam.startedAt) throw new BadRequestException('exam not started');
    if (exam.finishedAt) {
      return { exam: { ...exam, status: this.toExamStatus(exam) } };
    }

    const updated = await this.prisma.exam.update({
      where: { id: input.examId },
      data: { finishedAt: new Date() },
      select: { id: true, startedAt: true, finishedAt: true },
    });

    return { exam: { ...updated, status: this.toExamStatus(updated) } };
  }

  async getExamResults(input: { userId: string; examId: string }) {
    const base = await this.getExamQuestions(input);

    const attempts = await this.prisma.attempt.findMany({
      where: { userId: input.userId, examId: input.examId },
      select: { questionId: true, isCorrect: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // status per question:
    // - correct: any correct attempt inside this exam
    // - incorrect: attempted but no correct attempt
    // - unanswered: no attempts
    const statusByQuestionId = new Map<string, 'correct' | 'incorrect' | 'unanswered'>();
    const anyAttempt = new Set(attempts.map((a) => a.questionId));
    const anyCorrect = new Set(attempts.filter((a) => a.isCorrect).map((a) => a.questionId));

    for (const q of base.questions) {
      if (anyCorrect.has(q.id)) statusByQuestionId.set(q.id, 'correct');
      else if (anyAttempt.has(q.id)) statusByQuestionId.set(q.id, 'incorrect');
      else statusByQuestionId.set(q.id, 'unanswered');
    }

    const questions = base.questions.map((q) => ({
      ...q,
      status: statusByQuestionId.get(q.id) ?? 'unanswered',
    }));

    const correctCount = questions.filter((q) => q.status === 'correct').length;
    const incorrectCount = questions.filter((q) => q.status === 'incorrect').length;
    const unansweredCount = questions.filter((q) => q.status === 'unanswered').length;

    return {
      exam: {
        ...base.exam,
        correctCount,
        incorrectCount,
        unansweredCount,
      },
      questions,
    };
  }
}


