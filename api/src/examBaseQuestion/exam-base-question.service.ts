import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { CreateExamBaseQuestionDto } from './dto/create-exam-base-question.dto';
import {
  ParsedQuestionAlternative,
  ParsedQuestionItem,
  PARSED_QUESTION_EXAMPLE,
} from './dto/parsed-question.types';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';
import { jsonrepair } from 'jsonrepair';
import * as fs from 'fs/promises';
import * as path from 'path';

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

function normalizeToParsedQuestionItem(item: unknown): ParsedQuestionItem {
  if (
    !item ||
    typeof item !== 'object' ||
    !('subject' in item) ||
    !('statement' in item) ||
    !('alternatives' in item)
  ) {
    return {
      subject: '',
      statement: String(item ?? ''),
      alternatives: [],
    };
  }
  const o = item as Record<string, unknown>;
  const alternatives: ParsedQuestionAlternative[] = Array.isArray(o.alternatives)
    ? (o.alternatives as unknown[])
        .filter((a): a is Record<string, unknown> => a != null && typeof a === 'object')
        .map((a) => ({
          key: String(a?.key ?? ''),
          text: String(a?.text ?? ''),
        }))
    : [];
  return {
    subject: String(o.subject ?? ''),
    statement: String(o.statement ?? ''),
    topic: o.topic != null ? String(o.topic) : undefined,
    alternatives,
  };
}

@Injectable()
export class ExamBaseQuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async parseQuestionsFromMarkdown(
    markdown: string,
  ): Promise<ParsedQuestionItem[]> {
    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Set it in .env to use AI parsing.',
      );
    }

    const systemPrompt = `You are an assistant that extracts exam questions from markdown text.
Given the markdown content, identify EVERY question and its alternatives. Return ALL of them.
Return ONLY a valid JSON array, no other text or markdown. Rules for valid JSON:
- Each item: subject (string), statement (string), topic (string, optional), alternatives (array of { key: string, text: string }).
- Inside any string value, escape double quotes with backslash: \\".
- Do not put raw newlines inside string values; use \\n if needed.
- Return the complete array with every question you find, not just the first.
Example: ${JSON.stringify(PARSED_QUESTION_EXAMPLE)}`;

    const userPrompt = `Extract ALL questions from this markdown. Return only the JSON array (no code block, no explanation). Every question must appear in the array.\n\n${markdown}`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        max_tokens: 32768,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `xAI API error (${res.status}): ${errBody.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content =
      data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      return [];
    }

    console.log('content', content);
    const debugPath = path.join(process.cwd(), 'meu_arquivo.txt');
    await fs.writeFile(debugPath, content, 'utf8').catch(() => {});

    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    let parsed: unknown;
    let usedRepair = false;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const repaired = jsonrepair(jsonStr);
        parsed = JSON.parse(repaired);
        usedRepair = true;
      } catch (parseErr) {
        const message =
          parseErr instanceof Error ? parseErr.message : 'Invalid JSON';
        throw new BadRequestException(
          `AI returned invalid JSON. Try again or use a shorter text. (${message})`,
        );
      }
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(
        'AI response must be a JSON array of questions.',
      );
    }

    if (usedRepair && parsed.length === 1) {
      const subjectCount = (jsonStr.match(/"subject"\s*:/g) ?? []).length;
      if (subjectCount > 1) {
        throw new BadRequestException(
          'Only 1 question could be recovered (response may be truncated or invalid). Try with a shorter markdown text so the full JSON is returned.',
        );
      }
    }

    return parsed.map((item: unknown) =>
      normalizeToParsedQuestionItem(item),
    );
  }

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
