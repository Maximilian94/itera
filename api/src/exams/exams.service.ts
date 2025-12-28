import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

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
      select: { id: true, createdAt: true, questionCount: true },
    });

    const questions = await this.getExamQuestions({
      userId: input.userId,
      examId: exam.id,
    });

    return { exam, questions: questions.questions };
  }

  async getExamQuestions(input: { userId: string; examId: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true, createdAt: true, questionCount: true },
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
      exam: { id: exam.id, createdAt: exam.createdAt, questionCount: exam.questionCount },
      questions: rows.map((r) => r.question),
    };
  }
}


