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
  GenerateExplanationsResponse,
  GENERATE_EXPLANATIONS_RESPONSE_EXAMPLE,
} from './dto/generate-explanations-response.types';
import {
  ParsedQuestionAlternative,
  ParsedQuestionItem,
  PARSED_QUESTION_EXAMPLE,
} from './dto/parsed-question.types';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';
import { StorageService } from '../storage/storage.service';
import { jsonrepair } from 'jsonrepair';

const alternativesOrderBy = { key: 'asc' as const };

/** Max questions per API chunk to avoid model truncation/laziness. */
const MAX_QUESTIONS_PER_CHUNK = 10;

/**
 * Splits markdown into chunks at question boundaries (e.g. "1.", "2.", "Questão 1").
 * Each chunk has at most MAX_QUESTIONS_PER_CHUNK questions.
 */
function splitMarkdownIntoChunks(
  markdown: string,
): string[] {
  const boundaries: number[] = [0];
  const regex =
    /(?:^|\n)\s*(?:\d+[.)]\s|Questão\s+\d+(?:\s|[-–:])|\d+\s*[-–]\s|#\s*\d+\.?\s)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) {
    if (m.index !== boundaries[boundaries.length - 1]) {
      boundaries.push(m.index);
    }
  }
  boundaries.push(markdown.length);

  const questionCount = boundaries.length - 2;
  if (questionCount <= 0) {
    return [markdown];
  }

  if (questionCount <= MAX_QUESTIONS_PER_CHUNK) {
    return [markdown];
  }

  const chunks: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i += MAX_QUESTIONS_PER_CHUNK) {
    const start = boundaries[i];
    const endIdx = Math.min(
      i + MAX_QUESTIONS_PER_CHUNK,
      boundaries.length - 1,
    );
    const end = boundaries[endIdx];
    const chunk = markdown.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

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
  position: true,
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
    referenceText: o.referenceText != null ? String(o.referenceText) : undefined,
    alternatives,
  };
}

function normalizeGenerateExplanationsResponse(
  raw: unknown,
): GenerateExplanationsResponse {
  const o = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const topic = String(o.topic ?? '');
  const subtopics = Array.isArray(o.subtopics)
    ? (o.subtopics as unknown[]).map((s) => String(s))
    : [];
  const explanations = Array.isArray(o.explanations)
    ? (o.explanations as unknown[])
        .filter((e): e is Record<string, unknown> => e != null && typeof e === 'object')
        .map((e) => ({
          key: String(e.key ?? ''),
          explanation: String(e.explanation ?? ''),
        }))
    : [];
  return { topic, subtopics, explanations };
}

@Injectable()
export class ExamBaseQuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async parseQuestionsFromMarkdown(
    markdown: string,
    provider: 'grok' | 'chatgpt' = 'grok',
  ): Promise<{ questions: ParsedQuestionItem[]; rawResponse: string }> {
    const apiKey =
      provider === 'chatgpt'
        ? this.config.get<string>('OPENAI_API_KEY')
        : this.config.get<string>('XAI_API_KEY');
    const keyName = provider === 'chatgpt' ? 'OPENAI_API_KEY' : 'XAI_API_KEY';
    if (!apiKey) {
      throw new BadRequestException(
        `${keyName} is not configured. Set it in .env to use AI parsing with ${provider}.`,
      );
    }

    const chunks = splitMarkdownIntoChunks(markdown);
    const allQuestions: ParsedQuestionItem[] = [];
    const rawResponses: string[] = [];

    for (const chunk of chunks) {
      const { questions, rawResponse } = await this.extractQuestionsFromChunk(
        provider,
        apiKey,
        chunk,
      );
      allQuestions.push(...questions);
      rawResponses.push(rawResponse);
    }

    return {
      questions: allQuestions,
      rawResponse: rawResponses.join('\n\n---\n\n'),
    };
  }

  private async extractQuestionsFromChunk(
    provider: 'grok' | 'chatgpt',
    apiKey: string,
    markdown: string,
  ): Promise<{ questions: ParsedQuestionItem[]; rawResponse: string }> {
    const systemPrompt = `You are an assistant that extracts exam questions from markdown text.
Given the markdown content, identify EVERY question and its alternatives. Return ALL of them.
Return ONLY a valid JSON array, no other text or markdown.

CRITICAL: The input markdown usually contains MULTIPLE questions (e.g., numbered 1, 2, 3... or "Questão 1", "Questão 2").
You MUST return one array element per question. If the input has 15 questions, the array MUST have 15 elements.
NEVER return only one question when the source clearly has more. Scan the entire document before responding.

Important: PRESERVE MARKDOWN in the extracted text. In \`statement\` and in each \`alternatives[].text\`, keep the same markdown as in the source: **bold**, *italic*, line breaks, etc. Do not strip formatting to plain text.

JSON rules:
- Each item: subject (string), statement (string), topic (string, optional), referenceText (string, optional), alternatives (array of { key: string, text: string }).
- referenceText: when the exam has a shared passage/text that this question refers to (e.g. a text that 5 questions use), put that text here. Preserve markdown. Omit or leave empty when the question has no supporting text.
- Escape double quotes inside strings with backslash: \\".
- Use \\n for newlines inside string values.
- Return the complete array with every question you find, not just the first.
Example: ${JSON.stringify(PARSED_QUESTION_EXAMPLE)}`;

    const userPrompt = `Extract ALL questions from this markdown.

Steps: (1) Count how many distinct questions exist (look for numbering like 1., 2., 3. or "Questão 1", "Questão 2", etc.). (2) Extract each one as a separate object. The output array length must match the question count.

Return only the JSON array (no code block, no explanation). Preserve markdown formatting (bold, italic, line breaks) inside statement and each alternative text.\n\n${markdown}`;

    const apiUrl =
      provider === 'chatgpt'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.x.ai/v1/chat/completions';
    const model =
      provider === 'chatgpt' ? 'gpt-4o' : 'grok-4-1-fast-reasoning';
    const maxTokens = provider === 'chatgpt' ? 16384 : 32768;

    const { fetch: undiciFetch, Agent } = await import('undici');
    const agent = new Agent({
      connectTimeout: 30_000,
      headersTimeout: 300_000,
      bodyTimeout: 300_000,
    });

    const res = await undiciFetch(apiUrl, {
      method: 'POST',
      dispatcher: agent,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      const apiName = provider === 'chatgpt' ? 'OpenAI' : 'xAI';
      throw new BadRequestException(
        `${apiName} API error (${res.status}): ${errBody.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content =
      data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      return { questions: [], rawResponse: '' };
    }

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

    const questions = parsed.map((item: unknown) =>
      normalizeToParsedQuestionItem(item),
    );
    return { questions, rawResponse: content };
  }

  async extractPdfToMarkdown(file: { buffer: Buffer; mimetype: string; originalname?: string }): Promise<string> {
    const apiKey = this.config.get<string>('NANONETS_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'NANONETS_API_KEY is not configured. Set it in .env to use PDF extraction.',
      );
    }

    const buildFormData = () => {
      const fd = new FormData();
      fd.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        file.originalname || 'document.pdf',
      );
      fd.append('output_format', 'markdown');
      return fd;
    };

    const baseUrl = 'https://extraction-api.nanonets.com/api/v1';
    const headers = { Authorization: `Bearer ${apiKey}` };

    const res = await fetch(`${baseUrl}/extract/sync`, {
      method: 'POST',
      headers,
      body: buildFormData(),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        result?: { markdown?: { content?: string } };
      };
      const content = data?.result?.markdown?.content ?? '';
      console.log('Nanonets extraction content:', content);
      return content;
    }

    const errBody = await res.text();
    const shouldUseAsync =
      res.status === 400 &&
      (errBody.includes('/async') || errBody.includes('exceeding the maximum limit'));

    if (shouldUseAsync) {
      return this.extractPdfToMarkdownAsync(
        baseUrl,
        headers,
        buildFormData(),
        errBody,
      );
    }

    throw new BadRequestException(
      `Nanonets API error (${res.status}): ${errBody.slice(0, 500)}`,
    );
  }

  private async extractPdfToMarkdownAsync(
    baseUrl: string,
    headers: Record<string, string>,
    formData: FormData,
    _syncErrorBody: string,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/extract/async`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `Nanonets async API error (${res.status}): ${errBody.slice(0, 500)}`,
      );
    }

    const enqueue = (await res.json()) as {
      record_id?: string;
      status?: string;
      message?: string;
    };
    const recordId = enqueue.record_id;
    if (!recordId) {
      throw new BadRequestException(
        'Nanonets async API did not return record_id.',
      );
    }

    const maxWaitMs = 5 * 60 * 1000;
    const pollIntervalMs = 3000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      const resultRes = await fetch(
        `${baseUrl}/extract/results/${recordId}`,
        { headers },
      );
      if (!resultRes.ok) {
        const errBody = await resultRes.text();
        throw new BadRequestException(
          `Nanonets results API error (${resultRes.status}): ${errBody.slice(0, 500)}`,
        );
      }

      const resultData = (await resultRes.json()) as {
        status?: string;
        result?: { markdown?: { content?: string } };
        message?: string;
      };

      if (resultData.status === 'completed') {
        const content = resultData.result?.markdown?.content ?? '';
        console.log('Nanonets extraction content (async):', content);
        return content;
      }
      if (resultData.status === 'failed') {
        throw new BadRequestException(
          resultData.message ?? 'Nanonets extraction failed.',
        );
      }
    }

    throw new BadRequestException(
      'Nanonets extraction timed out. The document may be too large.',
    );
  }

  async generateExplanations(
    examBaseId: string,
    questionId: string,
  ): Promise<GenerateExplanationsResponse> {
    await assertQuestionBelongsToExamBase(
      this.prisma,
      examBaseId,
      questionId,
    );

    const question = await this.prisma.examBaseQuestion.findUnique({
      where: { id: questionId },
      select: {
        subject: true,
        statement: true,
        correctAlternative: true,
        alternatives: {
          orderBy: { key: 'asc' },
          select: { key: true, text: true },
        },
        examBase: { select: { name: true, institution: true } },
      },
    });
    if (!question) throw new NotFoundException('question not found');

    const correctAlt = question.correctAlternative?.trim();
    if (!correctAlt) {
      throw new BadRequestException(
        'A alternativa correta deve estar marcada para gerar explicações.',
      );
    }

    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Set it in .env to use AI explanations.',
      );
    }

    const examLabel = [question.examBase.name, question.examBase.institution]
      .filter(Boolean)
      .join(' — ');
    const alternativesText = question.alternatives
      .map((a) => `${a.key}) ${a.text}`)
      .join('\n\n');
    const correctInfo = question.correctAlternative
      ? `A alternativa correta é: ${question.correctAlternative}.`
      : 'Nenhuma alternativa correta foi indicada.';

    const responseTypeDescription = `Responda APENAS com um objeto JSON válido, sem markdown nem texto extra, no seguinte formato (TypeScript):\ninterface GenerateExplanationsResponse {\n  topic: string;        // nome TÉCNICO do tópico (ver regra abaixo)\n  subtopics: string[]; // nomes TÉCNICOS dos subtópicos\n  explanations: Array<{ key: string; explanation: string }>; // uma entrada por alternativa (key: "A", "B", ...)\n}\nExemplo: ${JSON.stringify(GENERATE_EXPLANATIONS_RESPONSE_EXAMPLE)}`;

    const systemPrompt = `Você é um especialista em elaboração de questões de concurso. Sua tarefa é gerar explicações de alto nível e bem completas para cada alternativa de uma questão de múltipla escolha.

${responseTypeDescription}

Regras para topic e subtopics:
- Use SEMPRE o nome técnico da matéria/assunto, não uma descrição em linguagem comum. Exemplos: em vez de "Pronúncia correta das palavras" use "Prosódia" ou "Ortografia e prosódia"; em vez de "Escrita correta" use "Ortografia"; em vez de "Concordância entre sujeito e verbo" use "Concordância verbal". O nome técnico é usado para recomendações de estudo, então deve ser o termo pelo qual o conteúdo é conhecido em programas de ensino e materiais didáticos.

Regras para o JSON:
- Escape aspas duplas dentro de strings com \\".
- Use \\n para quebras de linha dentro de strings.
- Inclua uma explicação para cada alternativa (todas as keys presentes na questão).
- As explicações devem ser didáticas, completas e de alto nível: por que a alternativa está correta ou incorreta, com base na prova e no conteúdo.
- IMPORTANTE: Nas explicações, NUNCA mencione a letra da alternativa (ex: "A alternativa A está correta"). Use apenas "A alternativa correta", "Esta alternativa está incorreta", "Correta porque...", "Incorreta porque...", etc. A ordem das alternativas pode ser alterada no futuro.`;

    const userPrompt = `Gere as explicações para a questão abaixo.

**Prova:** ${examLabel || 'Não informada'}
**Enunciado:** ${question.statement}

**Alternativas:**
${alternativesText}

**${correctInfo}**

Retorne o objeto JSON no formato GenerateExplanationsResponse (topic, subtopics, explanations para cada alternativa).`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        max_tokens: 8192,
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
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      throw new BadRequestException('AI returned empty response.');
    }

    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error ? parseErr.message : 'Invalid JSON';
        throw new BadRequestException(`AI returned invalid JSON. (${msg})`);
      }
    }

    return normalizeGenerateExplanationsResponse(parsed);
  }

  list(examBaseId: string) {
    return this.prisma.examBaseQuestion.findMany({
      where: { examBaseId },
      orderBy: { position: 'asc' },
      select: questionSelect,
    });
  }

  async reorder(examBaseId: string, questionIds: string[]) {
    if (questionIds.length === 0) return;

    const allForBase = await this.prisma.examBaseQuestion.findMany({
      where: { examBaseId },
      select: { id: true },
    });
    const idsSet = new Set(questionIds);
    if (idsSet.size !== questionIds.length) {
      throw new BadRequestException('questionIds must not contain duplicates');
    }
    if (allForBase.length !== questionIds.length) {
      throw new BadRequestException(
        'questionIds must contain all questions of this exam base',
      );
    }
    for (const q of allForBase) {
      if (!idsSet.has(q.id)) {
        throw new BadRequestException(
          `Missing question ${q.id} in reorder list`,
        );
      }
    }

    await this.prisma.$transaction(
      questionIds.map((id, index) =>
        this.prisma.examBaseQuestion.update({
          where: { id, examBaseId },
          data: { position: index },
        }),
      ),
    );
  }

  async getQuestionsCountBySubject(examBaseId: string): Promise<Array<{ subject: string; count: number }>> {
    const result = await this.prisma.examBaseQuestion.groupBy({
      by: ['subject'],
      where: { examBaseId },
      _count: { id: true },
    });
    return result.map((r) => ({
      subject: r.subject ?? '(sem matéria)',
      count: (r._count as { id: number }).id,
    }));
  }

  async listAvailableToAdd(targetExamBaseId: string, subject?: string) {
    const where: Prisma.ExamBaseQuestionWhereInput = {
      examBaseId: { not: targetExamBaseId },
    };
    if (subject && subject.trim()) {
      where.subject = subject.trim();
    }
    return this.prisma.examBaseQuestion.findMany({
      where,
      orderBy: [{ subject: 'asc' }, { topic: 'asc' }, { createdAt: 'asc' }],
      select: {
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
        examBase: {
          select: { id: true, name: true, institution: true },
        },
      },
    });
  }

  async listAvailableSubjects(targetExamBaseId: string) {
    const rows = await this.prisma.examBaseQuestion.findMany({
      where: { examBaseId: { not: targetExamBaseId } },
      select: { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' },
    });
    return rows
      .map((r) => r.subject?.trim())
      .filter((s): s is string => Boolean(s))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  async copyQuestion(
    targetExamBaseId: string,
    sourceExamBaseId: string,
    sourceQuestionId: string,
  ) {
    const source = await this.prisma.examBaseQuestion.findUnique({
      where: { id: sourceQuestionId, examBaseId: sourceExamBaseId },
      include: {
        alternatives: { orderBy: { key: 'asc' as const } },
      },
    });
    if (!source) throw new NotFoundException('question not found');
    return this.create(targetExamBaseId, {
      subject: source.subject ?? '',
      topic: source.topic ?? '',
      subtopics: source.subtopics ?? [],
      statement: source.statement,
      statementImageUrl: source.statementImageUrl ?? undefined,
      referenceText: source.referenceText ?? undefined,
      skills: source.skills ?? [],
      correctAlternative: source.correctAlternative ?? undefined,
      alternatives: source.alternatives.map((a) => ({
        key: a.key,
        text: a.text,
        explanation: a.explanation,
      })),
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
      const maxPosition = await tx.examBaseQuestion.aggregate({
        where: { examBaseId },
        _max: { position: true },
      });
      const nextPosition = (maxPosition._max.position ?? -1) + 1;

      const question = await tx.examBaseQuestion.create({
        data: {
          examBaseId,
          subject: dto.subject,
          topic: dto.topic,
          subtopics: dto.subtopics ?? [],
          statement: dto.statement,
          statementImageUrl: dto.statementImageUrl?.trim() || null,
          referenceText: dto.referenceText?.trim() || null,
          skills: dto.skills ?? [],
          correctAlternative: correctAlternative || null,
          position: nextPosition,
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

    const statementImageUrl =
      dto.statementImageUrl === undefined
        ? undefined
        : dto.statementImageUrl?.trim() || null;

    const referenceText =
      dto.referenceText === undefined
        ? undefined
        : dto.referenceText?.trim() || null;

    if (statementImageUrl === null) {
      const current = await this.prisma.examBaseQuestion.findUnique({
        where: { id: questionId },
        select: { statementImageUrl: true },
      });
      if (current?.statementImageUrl) {
        await this.storage.deleteByPublicUrl(current.statementImageUrl);
      }
    }

    return this.prisma.examBaseQuestion.update({
      where: { id: questionId },
      data: {
        subject: dto.subject,
        topic: dto.topic,
        subtopics: dto.subtopics,
        statement: dto.statement,
        statementImageUrl,
        referenceText,
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
    const current = await this.prisma.examBaseQuestion.findUnique({
      where: { id: questionId },
      select: { statementImageUrl: true },
    });
    if (current?.statementImageUrl) {
      await this.storage.deleteByPublicUrl(current.statementImageUrl);
    }
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
