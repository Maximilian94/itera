import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAnswerDto } from './dto/upsert-answer.dto';

const questionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  examBaseId: true,
  subject: true,
  topic: true,
  subtopics: true,
  statement: true,
  statementImageUrl: true,
  referenceText: true,
  correctAlternative: true,
  skills: true,
  alternatives: {
    orderBy: { key: 'asc' as const },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      key: true,
      text: true,
      explanation: true,
    },
  },
} as const;

@Injectable()
export class ExamBaseAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async list(examBaseId: string, userId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const attempts = await this.prisma.examBaseAttempt.findMany({
      where: { examBaseId, userId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    return attempts;
  }

  async create(examBaseId: string, userId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const attempt = await this.prisma.examBaseAttempt.create({
      data: {
        examBaseId,
        userId,
      },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
      },
    });
    return attempt;
  }

  async getOneWithQuestionsAndAnswers(
    examBaseId: string,
    attemptId: string,
    userId: string,
  ) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examBaseId: true,
        userId: true,
        startedAt: true,
        finishedAt: true,
        answers: {
          select: {
            examBaseQuestionId: true,
            selectedAlternativeId: true,
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');

    const questions = await this.prisma.examBaseQuestion.findMany({
      where: { examBaseId },
      orderBy: { createdAt: 'asc' },
      select: questionSelect,
    });

    const answers: Record<string, string | null> = {};
    for (const a of attempt.answers) {
      answers[a.examBaseQuestionId] = a.selectedAlternativeId;
    }

    return {
      attempt: {
        id: attempt.id,
        examBaseId: attempt.examBaseId,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
      },
      questions,
      answers,
    };
  }

  async upsertAnswer(
    examBaseId: string,
    attemptId: string,
    userId: string,
    dto: UpsertAnswerDto,
  ) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, examBaseId: true, userId: true, finishedAt: true },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');
    if (attempt.finishedAt != null)
      throw new BadRequestException('attempt is already finished');

    const question = await this.prisma.examBaseQuestion.findUnique({
      where: { id: dto.questionId },
      select: { id: true, examBaseId: true },
    });
    if (!question || question.examBaseId !== examBaseId)
      throw new NotFoundException('question not found');

    if (dto.selectedAlternativeId != null && dto.selectedAlternativeId !== '') {
      const alt = await this.prisma.examBaseQuestionAlternative.findUnique({
        where: { id: dto.selectedAlternativeId },
        select: { examBaseQuestionId: true },
      });
      if (!alt || alt.examBaseQuestionId !== dto.questionId)
        throw new BadRequestException(
          'selectedAlternativeId does not belong to this question',
        );
    }

    const selectedId =
      dto.selectedAlternativeId && dto.selectedAlternativeId.trim() !== ''
        ? dto.selectedAlternativeId
        : null;

    await this.prisma.examBaseAttemptAnswer.upsert({
      where: {
        examBaseAttemptId_examBaseQuestionId: {
          examBaseAttemptId: attemptId,
          examBaseQuestionId: dto.questionId,
        },
      },
      create: {
        examBaseAttemptId: attemptId,
        examBaseQuestionId: dto.questionId,
        selectedAlternativeId: selectedId,
      },
      update: { selectedAlternativeId: selectedId },
    });

    return {
      questionId: dto.questionId,
      selectedAlternativeId: selectedId,
    };
  }

  async finish(examBaseId: string, attemptId: string, userId: string) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, examBaseId: true, userId: true, finishedAt: true },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');
    if (attempt.finishedAt != null)
      throw new BadRequestException('attempt is already finished');

    const updated = await this.prisma.examBaseAttempt.update({
      where: { id: attemptId },
      data: { finishedAt: new Date() },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    return updated;
  }

  async getFeedback(
    examBaseId: string,
    attemptId: string,
    userId: string,
  ) {
    const data = await this.getOneWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );

    const attempt = data.attempt;
    if (attempt.finishedAt == null) {
      throw new BadRequestException(
        'feedback only available for finished attempts',
      );
    }

    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: {
        name: true,
        minPassingGradeNonQuota: true,
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const minPassing =
      examBase.minPassingGradeNonQuota != null
        ? Number(examBase.minPassingGradeNonQuota)
        : 60;

    const questions = data.questions;
    const answers = data.answers;

    let totalCorrect = 0;
    const bySubject: Record<
      string,
      { correct: number; total: number }
    > = {};

    for (const q of questions) {
      const subject = q.subject ?? 'Sem matéria';
      if (!bySubject[subject]) {
        bySubject[subject] = { correct: 0, total: 0 };
      }
      bySubject[subject].total += 1;

      const selectedId = answers[q.id] ?? null;
      if (selectedId == null) continue;

      const correctAlt = q.alternatives.find(
        (a) => a.key === q.correctAlternative,
      );
      const correctId = correctAlt?.id ?? null;
      if (correctId != null && selectedId === correctId) {
        bySubject[subject].correct += 1;
        totalCorrect += 1;
      }
    }

    const total = questions.length;
    const overallPercentage = total > 0 ? (totalCorrect / total) * 100 : 0;
    const passed = overallPercentage >= minPassing;

    const subjectStats = Object.entries(bySubject).map(
      ([subject, { correct, total: subTotal }]) => ({
        subject,
        correct,
        total: subTotal,
        percentage: subTotal > 0 ? (correct / subTotal) * 100 : 0,
      }),
    );

    return {
      examTitle: examBase.name,
      minPassingGradeNonQuota: minPassing,
      overall: {
        correct: totalCorrect,
        total,
        percentage: overallPercentage,
      },
      passed,
      subjectStats,
    };
  }
}
