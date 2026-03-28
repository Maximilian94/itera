import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import {
  ParsedQuestionFromPdf,
  PARSED_QUESTION_FROM_PDF_EXAMPLE,
} from './dto/parsed-question-from-pdf.types';

const SYSTEM_PROMPT = `
Você é um especialista em questões de concursos públicos brasileiros de saúde.

Você receberá dois documentos PDF:
1. A prova completa (pode conter questões de diversas áreas/cargos)
2. O gabarito oficial com as respostas corretas

Sua tarefa: extrair APENAS as questões relacionadas ao cargo de ENFERMEIRO / área de ENFERMAGEM e retornar um array JSON.

Para cada questão:
- Preserve a formatação markdown: **negrito**, *itálico*, \\n para quebras de linha dentro das strings
- Se o enunciado ou alternativa referenciar uma figura, imagem, gráfico ou tabela não representável como texto, defina hasImage: true
- Consulte o gabarito para preencher correctAlternative (ex: "A", "B", "C", "D", "E")
- Gere explicações didáticas, completas e de alto nível para CADA alternativa
- Se você discordar da resposta do gabarito, defina answerDoubt: true e preencha doubtReason

Nas explicações, NUNCA mencione a letra da alternativa (ex: "A alternativa A"). Use apenas "Esta alternativa", "A alternativa correta", "Esta opção", etc.

Retorne SOMENTE o array JSON, sem markdown nem texto adicional.

Formato:
${JSON.stringify([PARSED_QUESTION_FROM_PDF_EXAMPLE], null, 2)}
`.trim();

@Injectable()
export class ExamBaseQuestionPdfAiService {
  constructor(private readonly config: ConfigService) {}

  async parseQuestionsFromPdfs(
    examPdf: Buffer,
    gabaritoPdf: Buffer,
  ): Promise<ParsedQuestionFromPdf[]> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'ANTHROPIC_API_KEY não configurada. Configure-a no .env.',
      );
    }

    const client = new Anthropic({
      apiKey,
      timeout: 10 * 60 * 1000, // 10 minutes for large PDFs
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 32768,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: examPdf.toString('base64'),
              },
              title: 'Prova',
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: gabaritoPdf.toString('base64'),
              },
              title: 'Gabarito',
            },
            {
              type: 'text',
              text: 'Extraia todas as questões de enfermagem da prova, usando o gabarito para as respostas corretas. Retorne o JSON array.',
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new BadRequestException('Claude retornou resposta inesperada.');
    }

    let jsonStr = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }

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

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('Claude não retornou um array de questões.');
    }

    return parsed.map((item: unknown) => this.normalizeQuestion(item));
  }

  private normalizeQuestion(item: unknown): ParsedQuestionFromPdf {
    if (!item || typeof item !== 'object') {
      return this.emptyQuestion();
    }
    const o = item as Record<string, unknown>;
    return {
      number: typeof o.number === 'number' ? o.number : 0,
      subject: String(o.subject ?? ''),
      topic: String(o.topic ?? ''),
      subtopics: Array.isArray(o.subtopics)
        ? (o.subtopics as unknown[]).map(String)
        : [],
      statement: String(o.statement ?? ''),
      referenceText: o.referenceText != null ? String(o.referenceText) : null,
      hasImage: o.hasImage === true,
      alternatives: Array.isArray(o.alternatives)
        ? (o.alternatives as unknown[])
            .filter(
              (a): a is Record<string, unknown> =>
                a != null && typeof a === 'object',
            )
            .map((a) => ({
              key: String(a.key ?? ''),
              text: String(a.text ?? ''),
              explanation: String(a.explanation ?? ''),
            }))
        : [],
      correctAlternative:
        o.correctAlternative != null ? String(o.correctAlternative) : null,
      answerDoubt: o.answerDoubt === true,
      doubtReason: o.doubtReason != null ? String(o.doubtReason) : null,
    };
  }

  private emptyQuestion(): ParsedQuestionFromPdf {
    return {
      number: 0,
      subject: '',
      topic: '',
      subtopics: [],
      statement: '',
      referenceText: null,
      hasImage: false,
      alternatives: [],
      correctAlternative: null,
      answerDoubt: false,
      doubtReason: null,
    };
  }
}
