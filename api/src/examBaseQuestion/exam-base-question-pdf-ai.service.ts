import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import {
  ParsedQuestionFromPdf,
  PARSED_QUESTION_FROM_PDF_EXAMPLE,
  ParsedQuestionStructure,
  PARSED_QUESTION_STRUCTURE_EXAMPLE,
} from './dto/parsed-question-from-pdf.types';

// ─── Gabarito extraction (Claude Haiku — fast & cheap) ───────────────────────

function buildGabaritoSystemPrompt(cargo?: string): string {
  const cargoHint = cargo
    ? `O gabarito pode conter seções para diferentes cargos ou provas. Extraia SOMENTE as respostas da seção correspondente ao cargo "${cargo}". Se não encontrar essa seção, extraia a seção principal ou todas as respostas disponíveis.`
    : `O gabarito pode conter seções para diferentes cargos ou provas. Extraia as respostas da seção principal de Enfermeiro/Enfermagem. Se não houver seção específica, extraia todas as respostas.`;
  return `
Você é um assistente especializado em extrair gabaritos de concursos públicos brasileiros.
${cargoHint}
Retorne SOMENTE um objeto JSON com os pares número-letra, sem texto adicional:
{ "1": "A", "2": "C", "3": "B", ... }
`.trim();
}

// ─── Question structure parsing (Claude Sonnet — per chunk, no answers/explanations) ──

function buildStructureSystemPrompt(): string {
  return `
Você é um especialista em concursos públicos brasileiros.

Você receberá um trecho de markdown de uma prova.
Extraia TODAS as questões do trecho e retorne um array JSON.

INSTRUÇÕES OBRIGATÓRIAS:

1. EXTRAÇÃO
   - Extraia TODAS as questões presentes no trecho, sem exceção
   - Identifique o número da questão pelo seu número na prova
   - Preserve formatação markdown: **negrito**, *itálico*, \\n para quebras de linha
   - hasImage: true APENAS se o enunciado ou alguma alternativa referenciar explicitamente uma figura, imagem, gráfico ou tabela não representável como texto
   - referenceText: texto de contexto que precede um grupo de questões e é compartilhado por elas (ex: textos para interpretação, situações-problema, etc.); null se não houver
   - NÃO inclua respostas corretas nem explicações — apenas a estrutura da questão

2. IDENTIFICAÇÃO DO ASSUNTO
   - subject: matéria/área da questão. REGRA PRINCIPAL: se a prova já organiza as questões em seções com nome explícito (ex: cabeçalhos como "POLÍTICA DE SAÚDE", "ATENÇÃO PRIMÁRIA À SAÚDE", "FARMACOLOGIA"), use EXATAMENTE esse nome como subject para todas as questões dessa seção — sem alterar a grafia, sem resumir, sem substituir por sinônimo. Só defina o subject por conta própria se não houver nenhuma categorização explícita na prova. Questões da mesma seção devem sempre ter o mesmo subject.
   - topic: conceito central testado pela questão, usando nomenclatura técnica oficial (ex: "Hipertensão Arterial Sistêmica", "Lei Orgânica da Saúde — Lei 8.080/90", "Sistematização da Assistência de Enfermagem (SAE)"). Deve ser específico o suficiente para funcionar como um título de capítulo em material de estudo — nem tão amplo quanto a matéria, nem tão granular quanto um subtópico.
   - subtopics: array com 1 a 3 itens representando os aspectos EXATOS testados nessa questão específica (ex: ["Critérios diagnósticos", "Metas pressóricas"], ["Princípio da universalidade"]). Use terminologia técnica reconhecida. Não repita o topic nem o subject. Não inclua aspectos genéricos que se aplicariam a qualquer questão da matéria.

Retorne SOMENTE o array JSON, sem markdown nem texto adicional.
Formato de cada elemento: ${JSON.stringify(PARSED_QUESTION_STRUCTURE_EXAMPLE)}
`.trim();
}

// ─── Question parsing (OpenAI GPT-4o — per chunk) ────────────────────────────

function buildQuestionSystemPrompt(answerKey: Record<string, string>): string {
  return `
Você é um especialista em elaboração e resolução de questões de concursos públicos brasileiros.

Você receberá um trecho de markdown de uma prova e o gabarito completo.
Extraia TODAS as questões do trecho (independente da área) e retorne um array JSON.

Gabarito: ${JSON.stringify(answerKey)}

INSTRUÇÕES OBRIGATÓRIAS:

1. EXTRAÇÃO
   - Extraia TODAS as questões presentes no trecho, sem exceção
   - Identifique o número da questão e busque a resposta no gabarito
   - Preserve formatação markdown: **negrito**, *itálico*, \\n para quebras de linha
   - hasImage: true APENAS se o enunciado/alternativa referenciar explicitamente uma figura, imagem, gráfico ou tabela não representável como texto

2. VALIDAÇÃO DO GABARITO
   - Analise cuidadosamente qual alternativa você considera correta com base no conteúdo
   - Se sua conclusão divergir do gabarito: answerDoubt: true + doubtReason explicando objetivamente qual seria a resposta correta e por quê
   - Se concordar: answerDoubt: false, doubtReason: null

3. EXPLICAÇÕES — QUALIDADE MÁXIMA OBRIGATÓRIA
   Cada explicação deve ser uma análise profunda e didática. Siga estas regras sem exceção:
   - Mínimo de 3 parágrafos por alternativa
   - Para alternativas INCORRETAS: explique detalhadamente por que está errada, qual conceito ela viola ou distorce, e qual seria o cenário em que poderia confundir o candidato
   - Para a alternativa CORRETA: explique o fundamento teórico completo, cite princípios, protocolos ou evidências que a sustentam (ex: diretrizes do COFEN, protocolos do MS, fisiopatologia, farmacologia, etc.)
   - Use linguagem técnica apropriada à área da questão
   - NUNCA use frases genéricas como "Esta alternativa está incorreta porque não é a melhor opção"
   - NUNCA mencione a letra da alternativa nas explicações

Retorne SOMENTE o array JSON, sem markdown nem texto adicional.
Formato de cada elemento: ${JSON.stringify(PARSED_QUESTION_FROM_PDF_EXAMPLE)}
`.trim();
}

@Injectable()
export class ExamBaseQuestionPdfAiService {
  constructor(private readonly config: ConfigService) {}

  // ─── Public entry point ─────────────────────────────────────────────────────

  async parseQuestionsFromMarkdownAndGabarito(
    markdown: string,
    gabaritoPdf: Buffer,
  ): Promise<ParsedQuestionFromPdf[]> {
    const answerKey = await this.extractGabaritoAnswerKey(gabaritoPdf);
    return this.parseMarkdownChunks(markdown, answerKey);
  }

  // ─── Step 1: extract answer key via Claude Haiku ────────────────────────────

  async extractGabaritoAnswerKey(
    gabaritoPdf: Buffer,
    cargo?: string,
  ): Promise<Record<string, string>> {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new BadRequestException(
        'ANTHROPIC_API_KEY não configurada. Configure-a no .env.',
      );
    }

    const client = new Anthropic({ apiKey: anthropicKey, timeout: 60_000 });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: buildGabaritoSystemPrompt(cargo),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: gabaritoPdf.toString('base64'),
              },
              title: 'Gabarito',
            },
            { type: 'text', text: 'Extraia todas as respostas do gabarito.' },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new BadRequestException('Claude retornou resposta inesperada ao extrair gabarito.');
    }

    let jsonStr = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch (err) {
        throw new BadRequestException(
          `Claude retornou gabarito inválido: ${(err as Error).message?.slice(0, 200)}`,
        );
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Gabarito extraído em formato inesperado.');
    }

    // Normalize: ensure all values are uppercase strings
    const raw = parsed as Record<string, unknown>;
    const answerKey: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v != null) answerKey[String(k).trim()] = String(v).trim().toUpperCase();
    }
    return answerKey;
  }

  // ─── Step 2: parse markdown in chunks via OpenAI ────────────────────────────

  private async parseMarkdownChunks(
    markdown: string,
    answerKey: Record<string, string>,
  ): Promise<ParsedQuestionFromPdf[]> {
    const chunks = this.splitIntoChunks(markdown, 10);
    const systemPrompt = buildQuestionSystemPrompt(answerKey);
    const all: ParsedQuestionFromPdf[] = [];
    for (const chunk of chunks) {
      const questions = await this.parseOneChunk(systemPrompt, chunk);
      all.push(...questions);
    }
    return all;
  }

  /** Splits markdown into chunks of `size` questions. Exposed for frontend-driven chunking. */
  splitMarkdownIntoChunks(markdown: string, size = 10): string[] {
    return this.splitIntoChunks(markdown, size);
  }

  /**
   * Parses questions structure from a markdown chunk using GPT-4o.
   * No answers, no explanations. Used by the per-chunk endpoint.
   * When rangeFrom/rangeTo are provided, instructs GPT-4o to extract only that range
   * from the full markdown — avoiding the need for regex-based splitting.
   */
  async parseQuestionsStructureFromChunk(
    markdown: string,
  ): Promise<ParsedQuestionStructure[]> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada. Configure-a no .env.');
    }

    const { fetch: undiciFetch, Agent } = await import('undici');
    const agent = new Agent({ connectTimeout: 30_000, headersTimeout: 300_000, bodyTimeout: 300_000 });

    const chunks = this.splitIntoChunks(markdown, 5);
    const all: ParsedQuestionStructure[] = [];

    for (const chunk of chunks) {
      const res = await undiciFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        dispatcher: agent,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 8192,
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'exam_questions',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        number: { type: 'integer' },
                        subject: { type: 'string' },
                        topic: { type: 'string' },
                        subtopics: { type: 'array', items: { type: 'string' } },
                        statement: { type: 'string' },
                        referenceText: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                        hasImage: { type: 'boolean' },
                        alternatives: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              key: { type: 'string' },
                              text: { type: 'string' },
                            },
                            required: ['key', 'text'],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ['number', 'subject', 'topic', 'subtopics', 'statement', 'referenceText', 'hasImage', 'alternatives'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['questions'],
                additionalProperties: false,
              },
            },
          },
          messages: [
            { role: 'system', content: buildStructureSystemPrompt() },
            { role: 'user', content: `Extraia todas as questões e retorne em questions:\n\n${chunk}` },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new BadRequestException(`OpenAI API error (${res.status}): ${body.slice(0, 300)}`);
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!content) continue;

      const parsed = JSON.parse(content) as { questions: unknown[] };
      all.push(...(parsed.questions ?? []).map((item) => this.normalizeQuestionStructure(item)));
    }

    return all;
  }

  /**
   * Parses questions structure directly from a PDF using Claude Sonnet.
   * No answers, no explanations — just statement, alternatives, hasImage, referenceText.
   */
  async parseQuestionsStructureFromPdf(
    pdfBuffer: Buffer,
  ): Promise<ParsedQuestionStructure[]> {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new BadRequestException('ANTHROPIC_API_KEY não configurada. Configure-a no .env.');
    }

    const client = new Anthropic({ apiKey: anthropicKey, timeout: 600_000 });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 64000,
      system: buildStructureSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBuffer.toString('base64'),
              },
              title: 'Prova',
            },
            { type: 'text', text: 'Extraia todas as questões desta prova e retorne o JSON array.' },
          ],
        },
      ],
    });

    // Handle potential multi-block responses for large PDFs
    const textBlocks = response.content.filter((b) => b.type === 'text');
    if (textBlocks.length === 0) {
      throw new BadRequestException('Claude retornou resposta inesperada ao extrair estrutura.');
    }
    const fullText = textBlocks.map((b) => b.text).join('');

    return this.parseStructureJson(fullText);
  }

  /** Parses a single markdown chunk with the provided answer key. Used by the per-chunk endpoint. */
  async parseMarkdownChunk(
    markdownChunk: string,
    answerKey: Record<string, string>,
  ): Promise<ParsedQuestionFromPdf[]> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada. Configure-a no .env.');
    }
    return this.parseOneChunk(buildQuestionSystemPrompt(answerKey), markdownChunk);
  }

  private async parseOneChunk(
    systemPrompt: string,
    markdown: string,
  ): Promise<ParsedQuestionFromPdf[]> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada. Configure-a no .env.');
    }
    const { fetch: undiciFetch, Agent } = await import('undici');
    const agent = new Agent({ connectTimeout: 30_000, headersTimeout: 300_000, bodyTimeout: 300_000 });

    const res = await undiciFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      dispatcher: agent,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 16384,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extraia as questões de enfermagem deste trecho e retorne o JSON array:\n\n${markdown}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(`OpenAI API error (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return [];

    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch (err) {
        throw new BadRequestException(
          `OpenAI retornou JSON inválido: ${(err as Error).message?.slice(0, 200)}`,
        );
      }
    }

    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => this.normalizeQuestion(item));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private parseStructureJson(rawText: string): ParsedQuestionStructure[] {
    let jsonStr = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch (err) {
        throw new BadRequestException(
          `Claude retornou JSON inválido: ${(err as Error).message?.slice(0, 200)}`,
        );
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown) => this.normalizeQuestionStructure(item));
  }

  /**
   * Splits markdown at question boundaries into chunks of at most `size` questions.
   */
  private splitIntoChunks(markdown: string, size: number): string[] {
    const boundaries: number[] = [0];
    const regex = /(?:^|\n)\s*(?:\d+[.)]\s|Questão\s+\d+(?:\s|[-–:])|\d+\s*[-–]\s|#\s*\d+\.?\s)/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(markdown)) !== null) {
      if (m.index !== boundaries[boundaries.length - 1]) boundaries.push(m.index);
    }
    boundaries.push(markdown.length);

    if (boundaries.length - 2 <= 0) return [markdown];

    const chunks: string[] = [];
    for (let i = 0; i < boundaries.length - 1; i += size) {
      const start = boundaries[i];
      const endIdx = Math.min(i + size, boundaries.length - 1);
      const chunk = markdown.slice(start, boundaries[endIdx]).trim();
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }

  private normalizeQuestionStructure(item: unknown): ParsedQuestionStructure {
    if (!item || typeof item !== 'object') {
      return {
        number: 0, subject: '', topic: '', subtopics: [], statement: '',
        referenceText: null, hasImage: false, alternatives: [],
      };
    }
    const o = item as Record<string, unknown>;
    return {
      number: typeof o.number === 'number' ? o.number : 0,
      subject: String(o.subject ?? ''),
      topic: String(o.topic ?? ''),
      subtopics: Array.isArray(o.subtopics) ? (o.subtopics as unknown[]).map(String) : [],
      statement: String(o.statement ?? ''),
      referenceText: o.referenceText != null ? String(o.referenceText) : null,
      hasImage: o.hasImage === true,
      alternatives: Array.isArray(o.alternatives)
        ? (o.alternatives as unknown[])
            .filter((a): a is Record<string, unknown> => a != null && typeof a === 'object')
            .map((a) => ({
              key: String(a.key ?? ''),
              text: String(a.text ?? ''),
            }))
        : [],
    };
  }

  private normalizeQuestion(item: unknown): ParsedQuestionFromPdf {
    if (!item || typeof item !== 'object') return this.emptyQuestion();
    const o = item as Record<string, unknown>;
    return {
      number: typeof o.number === 'number' ? o.number : 0,
      subject: String(o.subject ?? ''),
      topic: String(o.topic ?? ''),
      subtopics: Array.isArray(o.subtopics) ? (o.subtopics as unknown[]).map(String) : [],
      statement: String(o.statement ?? ''),
      referenceText: o.referenceText != null ? String(o.referenceText) : null,
      hasImage: o.hasImage === true,
      alternatives: Array.isArray(o.alternatives)
        ? (o.alternatives as unknown[])
            .filter((a): a is Record<string, unknown> => a != null && typeof a === 'object')
            .map((a) => ({
              key: String(a.key ?? ''),
              text: String(a.text ?? ''),
              explanation: String(a.explanation ?? ''),
            }))
        : [],
      correctAlternative: o.correctAlternative != null ? String(o.correctAlternative) : null,
      answerDoubt: o.answerDoubt === true,
      doubtReason: o.doubtReason != null ? String(o.doubtReason) : null,
    };
  }

  private emptyQuestion(): ParsedQuestionFromPdf {
    return {
      number: 0, subject: '', topic: '', subtopics: [], statement: '',
      referenceText: null, hasImage: false, alternatives: [],
      correctAlternative: null, answerDoubt: false, doubtReason: null,
    };
  }
}
