import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface PciRawEntry {
  examName: string;
  downloadUrl: string;
  year: number;
  institution: string;
  examBoardRaw: string;
  pageUrl: string;
}

@Injectable()
export class PciParserService {
  private readonly logger = new Logger(PciParserService.name);
  private readonly baseUrl = 'https://www.pciconcursos.com.br';

  async fetchAndParsePage(
    cargoSlug: string,
    page: number,
  ): Promise<{ entries: PciRawEntry[]; totalPages: number }> {
    const pageUrl =
      page === 1
        ? `${this.baseUrl}/provas/${cargoSlug}/`
        : `${this.baseUrl}/provas/${cargoSlug}/${page}`;

    const html = await this.fetchWithRetry(pageUrl);
    const $ = cheerio.load(html);
    const totalPages = this.detectTotalPages($);
    const entries = this.parseTable($, pageUrl);

    this.logger.log(
      `Parsed ${entries.length} entries from ${pageUrl} (total pages: ${totalPages})`,
    );

    return { entries, totalPages };
  }

  private parseTable($: cheerio.CheerioAPI, pageUrl: string): PciRawEntry[] {
    const entries: PciRawEntry[] = [];

    $('table.provas tr').each((_i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const linkEl = $(cells[0]).find('a');
      const examName = linkEl.text().trim();
      let downloadUrl = linkEl.attr('href') ?? '';

      if (!examName || !downloadUrl) return;

      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${this.baseUrl}${downloadUrl}`;
      }

      const yearText = $(cells[1]).text().trim();
      const year = parseInt(yearText, 10);
      if (isNaN(year)) return;

      const institution = $(cells[2]).text().trim();
      const examBoardRaw = $(cells[3]).text().trim();

      if (!institution) return;

      entries.push({
        examName,
        downloadUrl,
        year,
        institution,
        examBoardRaw,
        pageUrl,
      });
    });

    return entries;
  }

  private detectTotalPages($: cheerio.CheerioAPI): number {
    let max = 1;
    $('a.proxima, a[href*="/provas/"]').each((_i, el) => {
      const href = $(el).attr('href') ?? '';
      const match = href.match(/\/provas\/[^/]+\/(\d+)/);
      if (match) {
        const pageNum = parseInt(match[1], 10);
        if (pageNum > max) max = pageNum;
      }
    });

    const paginationText = $('div.paginacao, nav.pagination, .pagination')
      .text()
      .trim();
    const pageNumbers = paginationText.match(/\d+/g);
    if (pageNumbers) {
      for (const n of pageNumbers) {
        const num = parseInt(n, 10);
        if (num > max && num <= 99) max = num;
      }
    }

    return max;
  }

  private async fetchWithRetry(
    url: string,
    attempts = 3,
  ): Promise<string> {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; IteraBot/1.0; +https://maximizeenfermagem.com.br)',
            Accept: 'text/html',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }

        return await response.text();
      } catch (err) {
        if (i === attempts - 1) throw err;
        const delay = 1000 * Math.pow(2, i);
        this.logger.warn(
          `Fetch attempt ${i + 1} failed for ${url}, retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new Error(`Failed to fetch ${url} after ${attempts} attempts`);
  }
}
