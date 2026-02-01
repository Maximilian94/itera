import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { CreateExamBaseQuestionDto } from './dto/create-exam-base-question.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';

const alternativesOrderBy = { key: 'asc' as const };

const questionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  examBaseId: true,
  subject: true,
  topic: true,
  subtopics: true,
  statement: true,
  correctAlternative: true,
  skills: true,
  alternatives: {
    orderBy: alternativesOrderBy,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      key: true,
      text: true,
      explanation: true,
    },
  },
};

async function assertQuestionBelongsToExamBase(
  prisma: PrismaService,
  examBaseId: string,
  questionId: string,
): Promise<void> {
  const question = await prisma.examBaseQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, examBaseId: true },
  });
  if (!question || question.examBaseId !== examBaseId) {
    throw new NotFoundException('question not found');
  }
}

async function assertAlternativeBelongsToQuestion(
  prisma: PrismaService,
  examBaseId: string,
  questionId: string,
  alternativeId: string,
): Promise<void> {
  const alternative = await prisma.examBaseQuestionAlternative.findUnique({
    where: { id: alternativeId },
    include: { examBaseQuestion: { select: { id: true, examBaseId: true } } },
  });
  if (
    !alternative ||
    alternative.examBaseQuestion.id !== questionId ||
    alternative.examBaseQuestion.examBaseId !== examBaseId
  ) {
    throw new NotFoundException('alternative not found');
  }
}

function throwConflictIfUniqueKey(err: unknown): void {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    throw new ConflictException(
      'An alternative with this key already exists for this question.',
    );
  }
  throw err;
}

@Injectable()
export class ExamBaseQuestionService {
  constructor(private readonly prisma: PrismaService) {}

  list(examBaseId: string) {
    return this.prisma.examBaseQuestion.findMany({
      where: { examBaseId },
      orderBy: { createdAt: 'asc' },
      select: questionSelect,
    });
  }

  async getOne(examBaseId: string, questionId: string) {
    await assertQuestionBelongsToExamBase(
      this.prisma,
      examBaseId,
      questionId,
    );
    const question = await this.prisma.examBaseQuestion.findUnique({
      where: { id: questionId },
      select: questionSelect,
    });
    if (!question) throw new NotFoundException('question not found');
    return question;
  }

  async create(examBaseId: string, dto: CreateExamBaseQuestionDto) {
    const correctAlternative = dto.correctAlternative?.trim();
    const alternatives = dto.alternatives ?? [];

    if (correctAlternative && alternatives.length > 0) {
      const keys = alternatives.map((a) => a.key.trim());
      if (!keys.includes(correctAlternative)) {
        throw new BadRequestException(
          'correctAlternative must match one of the provided alternative keys.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.examBaseQuestion.create({
        data: {
          examBaseId,
          subject: dto.subject,
          topic: dto.topic,
          subtopics: dto.subtopics ?? [],
          statement: dto.statement,
          skills: dto.skills ?? [],
          correctAlternative: correctAlternative || null,
        },
        select: questionSelect,
      });

      if (alternatives.length > 0) {
        await tx.examBaseQuestionAlternative.createMany({
          data: alternatives.map((a) => ({
            examBaseQuestionId: question.id,
            key: a.key.trim(),
            text: a.text,
            explanation: a.explanation,
          })),
        });
      }

      return tx.examBaseQuestion.findUniqueOrThrow({
        where: { id: question.id },
        select: questionSelect,
      });
    });
  }

  async update(
    examBaseId: string,
    questionId: string,
    dto: UpdateExamBaseQuestionDto,
  ) {
    await assertQuestionBelongsToExamBase(
      this.prisma,
      examBaseId,
      questionId,
    );

    if (dto.correctAlternative !== undefined) {
      const correctVal = dto.correctAlternative.trim();
      if (correctVal) {
        const exists = await this.prisma.examBaseQuestionAlternative.findFirst({
          where: {
            examBaseQuestionId: questionId,
            key: correctVal,
          },
        });
        if (!exists) {
          throw new BadRequestException(
            'correctAlternative must match an existing alternative key for this question.',
          );
        }
      }
    }

    const correctAlternative =
      dto.correctAlternative === undefined
        ? undefined
        : dto.correctAlternative?.trim() || null;

    return this.prisma.examBaseQuestion.update({
      where: { id: questionId },
      data: {
        subject: dto.subject,
        topic: dto.topic,
        subtopics: dto.subtopics,
        statement: dto.statement,
        skills: dto.skills,
        correctAlternative,
      },
      select: questionSelect,
    });
  }

  async delete(examBaseId: string, questionId: string): Promise<void> {
    await assertQuestionBelongsToExamBase(
      this.prisma,
      examBaseId,
      questionId,
    );
    await this.prisma.examBaseQuestion.delete({
      where: { id: questionId },
    });
  }

  async createAlternative(
    examBaseId: string,
    questionId: string,
    dto: CreateAlternativeDto,
  ) {
    await assertQuestionBelongsToExamBase(
      this.prisma,
      examBaseId,
      questionId,
    );

    try {
      return await this.prisma.examBaseQuestionAlternative.create({
        data: {
          examBaseQuestionId: questionId,
          key: dto.key.trim(),
          text: dto.text,
          explanation: dto.explanation,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          key: true,
          text: true,
          explanation: true,
        },
      });
    } catch (err) {
      throwConflictIfUniqueKey(err);
    }
  }

  async updateAlternative(
    examBaseId: string,
    questionId: string,
    alternativeId: string,
    dto: UpdateAlternativeDto,
  ) {
    await assertAlternativeBelongsToQuestion(
      this.prisma,
      examBaseId,
      questionId,
      alternativeId,
    );

    try {
      return await this.prisma.examBaseQuestionAlternative.update({
        where: { id: alternativeId },
        data: {
          key: dto.key?.trim(),
          text: dto.text,
          explanation: dto.explanation,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          key: true,
          text: true,
          explanation: true,
        },
      });
    } catch (err) {
      throwConflictIfUniqueKey(err);
    }
  }

  async deleteAlternative(
    examBaseId: string,
    questionId: string,
    alternativeId: string,
  ): Promise<void> {
    await assertAlternativeBelongsToQuestion(
      this.prisma,
      examBaseId,
      questionId,
      alternativeId,
    );
    await this.prisma.examBaseQuestionAlternative.delete({
      where: { id: alternativeId },
    });
  }
}
