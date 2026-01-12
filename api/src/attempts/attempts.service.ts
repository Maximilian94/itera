import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAttempt(input: {
    userId: string;
    examId?: string;
    questionId: string;
    selectedOptionId: string;
  }) {
    if (input.examId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: input.examId },
        select: { id: true, userId: true },
      });
      if (!exam) throw new NotFoundException('exam not found');
      if (exam.userId !== input.userId)
        throw new ForbiddenException('exam does not belong to user');

      const isInExam = await this.prisma.examQuestion.findUnique({
        where: {
          examId_questionId: {
            examId: input.examId,
            questionId: input.questionId,
          },
        },
        select: { examId: true },
      });
      if (!isInExam)
        throw new BadRequestException('question does not belong to exam');
    }

    const question = await this.prisma.question.findUnique({
      where: { id: input.questionId },
      select: { id: true, explanationText: true },
    });
    if (!question) throw new NotFoundException('question not found');

    const option = await this.prisma.option.findUnique({
      where: { id: input.selectedOptionId },
      select: { id: true, questionId: true, isCorrect: true },
    });
    if (!option) throw new NotFoundException('option not found');
    if (option.questionId !== input.questionId) {
      throw new BadRequestException('option does not belong to question');
    }

    const correctOption = await this.prisma.option.findFirst({
      where: { questionId: input.questionId, isCorrect: true },
      select: { id: true },
    });
    if (!correctOption) throw new NotFoundException('correct option not found');

    const attempt = await this.prisma.attempt.create({
      data: {
        user: { connect: { id: input.userId } },
        ...(input.examId ? { exam: { connect: { id: input.examId } } } : {}),
        question: { connect: { id: input.questionId } },
        selectedOption: { connect: { id: input.selectedOptionId } },
        isCorrect: option.isCorrect,
      },
      select: {
        id: true,
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
        createdAt: true,
      },
    });

    return {
      attempt: {
        id: attempt.id,
        examId: input.examId ?? null,
        questionId: attempt.questionId,
        selectedOptionId: attempt.selectedOptionId,
        isCorrect: attempt.isCorrect,
        createdAt: attempt.createdAt,
      },
      feedback: {
        isCorrect: attempt.isCorrect,
        correctOptionId: correctOption.id,
        explanationText: question.explanationText,
      },
    };
  }

  async getAttempts(input: { userId: string; examId: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, userId: true },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.userId !== input.userId)
      throw new ForbiddenException('exam does not belong to user');

    const attempts = await this.prisma.attempt.findMany({
      where: { userId: input.userId, examId: input.examId },
      select: {
        questionId: true,
        selectedOptionId: true,
        isCorrect: true,
      },
    });

    const questionIds = attempts.map((a) => a.questionId);
    const correctOptions = await this.prisma.option.findMany({
      where: { questionId: { in: questionIds }, isCorrect: true },
      select: { questionId: true, id: true },
    });
    const correctOptionIdByQuestionId = new Map(
      correctOptions.map((o) => [o.questionId, o.id]),
    );

    return attempts.map((a) => {
      const correctOptionId = correctOptionIdByQuestionId.get(a.questionId);
      if (!correctOptionId) {
        throw new NotFoundException('correct option not found');
      }
      return {
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        isCorrect: a.isCorrect,
        correctOptionId,
      };
    });
  }
}
