import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import {
  ParsedQuestionFromPdf,
  PARSED_QUESTION_FROM_PDF_EXAMPLE,
} from './dto/parsed-question-from-pdf.types';

// ─── Gabarito extraction (Claude Haiku — fast & cheap) ───────────────────────

const GABARITO_SYSTEM_PROMPT = `
Você é um assistente especializado em extrair gabaritos de concursos públicos brasileiros.
Dado um PDF de gabarito, extraia TODAS as respostas no formato JSON:
{ "1": "A", "2": "C", "3": "B", ... }
Inclua apenas os pares número-letra. Retorne SOMENTE o JSON, sem texto adicional.
`.trim();

// ─── Question parsing (OpenAI GPT-4o — per chunk) ────────────────────────────

function buildQuestionSystemPrompt(answerKey: Record<string, string>): string {
  return `
Você é um especialista em questões de concursos públicos brasileiros de enfermagem.

Você receberá um trecho de markdown de uma prova e o gabarito completo.
Extraia APENAS as questões de ENFERMAGEM do trecho e retorne um array JSON.

Gabarito completo: ${JSON.stringify(answerKey)}

Para cada questão:
- Identifique o número da questão no texto e busque a resposta no gabarito acima
- Preserve formatação markdown: **negrito**, *itálico*, \\n para quebras de linha
- hasImage: true se o enunciado/alternativa referenciar figura, imagem ou gráfico não textual
- Gere explicações didáticas e completas para CADA alternativa
- answerDoubt: true se você discordar da resposta do gabarito; preencha doubtReason

Nas explicações, NUNCA mencione a letra da alternativa. Use "Esta alternativa", "A alternativa correta", etc.

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

  async extractGabaritoAnswerKey(gabaritoPdf: Buffer): Promise<Record<string, string>> {
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
      system: GABARITO_SYSTEM_PROMPT,
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
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new BadRequestException('OPENAI_API_KEY não configurada. Configure-a no .env.');
    }

    const chunks = this.splitIntoChunks(markdown, 10);
    const systemPrompt = buildQuestionSystemPrompt(answerKey);
    const all: ParsedQuestionFromPdf[] = [];

    for (const chunk of chunks) {
      const questions = await this.parseChunk(openaiKey, systemPrompt, chunk);
      all.push(...questions);
    }

    return all;
  }

  private async parseChunk(
    apiKey: string,
    systemPrompt: string,
    markdown: string,
  ): Promise<ParsedQuestionFromPdf[]> {
    const { fetch: undiciFetch, Agent } = await import('undici');
    const agent = new Agent({ connectTimeout: 30_000, headersTimeout: 300_000, bodyTimeout: 300_000 });

    const res = await undiciFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      dispatcher: agent,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
