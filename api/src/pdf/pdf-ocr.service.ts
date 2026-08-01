import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
  options?: { max?: number },
) => Promise<{ text: string }>;

/** De onde saiu o texto — útil para log/diagnóstico. */
export type PdfTextSource = 'ocr' | 'pdf-parse';

/**
 * Conversão PDF → texto para a IA, com preferência por **Mistral OCR**
 * (`mistral-ocr-latest`): ele entende o layout e devolve as TABELAS como
 * markdown alinhado — crítico para o quadro de provas / conteúdo programático
 * e para o cronograma, que o `pdf-parse` achata e embaralha. Fallback para o
 * `pdf-parse` local quando o OCR não está configurado, falha ou vem vazio (não
 * ficar refém de uma API só). OCR ainda cobre PDF escaneado, que o pdf-parse não lê.
 */
@Injectable()
export class PdfOcrService {
  private readonly logger = new Logger(PdfOcrService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * @param maxPages cap de páginas do FALLBACK pdf-parse (o OCR processa o doc
   *   inteiro). Protege a CPU quando cai no pdf-parse de um edital gigante.
   */
  async pdfToText(
    buffer: Buffer,
    opts: { maxPages?: number } = {},
  ): Promise<{ text: string; source: PdfTextSource }> {
    const key = this.config.get<string>('MISTRAL_API_KEY');
    if (key) {
      try {
        const markdown = await this.extractMarkdownWithMistralOcr(buffer, key);
        if (markdown.trim() !== '') return { text: markdown, source: 'ocr' };
        this.logger.warn('Mistral OCR retornou vazio — caindo para pdf-parse.');
      } catch (err) {
        this.logger.warn(
          `Mistral OCR falhou (${(err as Error).message?.slice(0, 150)}) — caindo para pdf-parse.`,
        );
      }
    }
    const text = await this.pdfParseText(buffer, opts.maxPages);
    return { text, source: 'pdf-parse' };
  }

  /** PDF → markdown via Mistral OCR (tabelas preservadas). Sem imagens. */
  private async extractMarkdownWithMistralOcr(
    buffer: Buffer,
    apiKey: string,
  ): Promise<string> {
    // undici + Agent p/ timeouts longos (edital de 200 págs demora no OCR); é
    // o mesmo padrão do parser de PDF de questões (ExamBaseQuestionPdfAiService).
    const { fetch: undiciFetch, Agent } = await import('undici');
    const agent = new Agent({
      connectTimeout: 30_000,
      headersTimeout: 600_000,
      bodyTimeout: 600_000,
    });

    const res = await undiciFetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      dispatcher: agent,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${buffer.toString('base64')}`,
        },
        include_image_base64: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(
        `Mistral OCR error (${res.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as {
      pages?: { markdown: string }[];
    };
    return (data.pages ?? []).map((p) => p.markdown).join('\n\n');
  }

  /** Fallback local: extrai o texto cru (achata tabelas). */
  private async pdfParseText(buffer: Buffer, maxPages = 200): Promise<string> {
    try {
      const data = await pdfParse(buffer, { max: maxPages });
      return data.text ?? '';
    } catch (err) {
      throw new BadRequestException(
        `Falha ao extrair texto do PDF: ${(err as Error).message?.slice(0, 200)}`,
      );
    }
  }
}
