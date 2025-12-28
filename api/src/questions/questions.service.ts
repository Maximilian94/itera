import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listQuestions(input: { userId: string; skillIds?: string[]; onlyUnsolved?: boolean }) {
    const where: Prisma.QuestionWhereInput = {};

    if (input.skillIds?.length) where.skillId = { in: input.skillIds };

    if (input.onlyUnsolved) {
      where.AND = [
        { attempts: { some: { userId: input.userId } } },
        { attempts: { none: { userId: input.userId, isCorrect: true } } },
      ];
    }

    const questions = await this.prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        statement: true,
        skillId: true,
        options: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true },
        },
      },
    });

    return { questions };
  }
}


