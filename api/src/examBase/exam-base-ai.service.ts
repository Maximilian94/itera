import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>;
import type { ExtractedExamMetadata } from './dto/extract-metadata.dto';

const SYSTEM_PROMPT = `
Você é um assistente especializado em extrair informações de editais de concursos públicos brasileiros.
Dado um texto de edital, extraia os seguintes campos e retorne SOMENTE um JSON válido, sem markdown, sem explicações.

O edital pode conter múltiplos cargos. Foque EXCLUSIVAMENTE no cargo de Enfermeiro. Extraia salário, nota de corte e demais dados específicos deste cargo.

Campos a extrair:
- name: nome completo do concurso/prova (ex: "Concurso Público Prefeitura de São Paulo 2024")
- role: nome exato do cargo de Enfermeiro conforme consta no edital
- governmentScope: âmbito do governo, um de: "MUNICIPAL", "STATE", "FEDERAL"
- examDate: data da prova no formato ISO 8601 (ex: "2024-06-15")
- institution: nome da instituição/órgão contratante (ex: "Prefeitura Municipal de São Paulo")
- state: sigla do estado brasileiro em maiúsculas (ex: "SP"), null se federal
- city: nome da cidade (ex: "São Paulo"), null se não municipal
- salaryBase: salário base do cargo de Enfermeiro como string numérica com até 2 decimais (ex: "5800.00"), null se não encontrado
- minPassingGradeNonQuota: nota mínima de aprovação para ampla concorrência como string numérica (ex: "60.00"), null se não encontrado
- examBoardName: nome completo da banca organizadora (ex: "Fundação Carlos Chagas"), null se não encontrado
- examBoardAlias: sigla da banca (ex: "FCC"), null se não encontrado
- editalUrl: URL direta para download do PDF do edital, caso encontrada na página, null se não encontrado

Retorne apenas o JSON. Exemplo:
{"name":"...","role":"Enfermeiro","governmentScope":"MUNICIPAL","examDate":"2024-06-15","institution":"...","state":"SP","city":"São Paulo","salaryBase":"5800.00","minPassingGradeNonQuota":"60.00","examBoardName":"Fundação Carlos Chagas","examBoardAlias":"FCC","editalUrl":null}
`.trim();

@Injectable()
export class ExamBaseAiService {
  constructor(private readonly config: ConfigService) {}

  async extractMetadata(input: {
    url?: string;
    role?: string;
    pdfFile?: { buffer: Buffer; mimetype: string; originalname?: string } | undefined;
  }): Promise<ExtractedExamMetadata> {
    let text = '';

    if (input.pdfFile) {
      text = await this.extractTextFromPdf(input.pdfFile.buffer);
    } else if (input.url) {
      text = await this.fetchUrlContent(input.url);
    }

    if (!text.trim()) {
      throw new BadRequestException('Nenhum conteúdo pôde ser extraído da URL ou PDF fornecido.');
    }

    return this.callOpenAI(text);
  }

  private async fetchUrlContent(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) {
      throw new BadRequestException(
        res.status === 403
          ? `O site bloqueou o acesso direto (403). Faça o upload do PDF manualmente.`
          : `Falha ao buscar URL (${res.status}): ${url.slice(0, 200)}`,
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      const buffer = Buffer.from(await res.arrayBuffer());
      return this.extractTextFromPdf(buffer);
    }

    return res.text();
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text ?? '';
    } catch (err) {
      throw new BadRequestException(
        `Falha ao extrair texto do PDF: ${(err as Error).message?.slice(0, 200)}`,
      );
    }
  }

  private async callOpenAI(text: string): Promise<ExtractedExamMetadata> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'OPENAI_API_KEY não configurada. Configure-a no .env.',
      );
    }

    // Truncate to avoid token limits (approx 120k chars ~ 30k tokens)
    const truncatedText = text.slice(0, 120_000);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: truncatedText },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `OpenAI API error (${res.status}): ${errBody.slice(0, 300)}`,
      );
    }

    const dataRes = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = dataRes.choices?.[0]?.message?.content?.trim() ?? '';

    let jsonStr = content
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
      throw new BadRequestException('OpenAI retornou JSON inválido na extração de metadados.');
    }

    return (typeof parsed === 'object' && parsed != null ? parsed : {}) as ExtractedExamMetadata;
  }
}
