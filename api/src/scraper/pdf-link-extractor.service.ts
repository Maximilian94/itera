import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { chromium, type Browser, type Page } from 'playwright';

export interface ExtractedPdfLink {
  /** URL absoluta do PDF */
  url: string;
  /** Texto visível do link/elemento que aponta pro PDF (quando houver) */
  label: string | null;
  /** Como o PDF foi encontrado na página */
  source: 'anchor' | 'embed' | 'network';
}

export interface PdfExtractionResult {
  pageUrl: string;
  finalUrl: string;
  pageTitle: string;
  pdfLinks: ExtractedPdfLink[];
  extractedAt: string;
}

const NAVIGATION_TIMEOUT_MS = 30_000;
// Espera curta após o load para dar chance a conteúdo carregado via JS.
const POST_LOAD_SETTLE_MS = 2_000;

/**
 * Extrai URLs de PDFs de uma página arbitrária usando browser headless
 * (Playwright), cobrindo páginas que só renderizam os links via JavaScript.
 *
 * Estratégia em 3 camadas:
 * 1. `anchor` — <a href> que termina em .pdf ou contém ".pdf" na URL;
 * 2. `embed` — <embed>/<iframe>/<object> apontando para PDF;
 * 3. `network` — respostas de rede com Content-Type application/pdf
 *    disparadas durante o carregamento (pega PDFs atrás de redirects).
 */
@Injectable()
export class PdfLinkExtractorService {
  private readonly logger = new Logger(PdfLinkExtractorService.name);

  async extractFromUrl(url: string): Promise<PdfExtractionResult> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException(`URL inválida: ${url}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Apenas URLs http/https são suportadas');
    }

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (compatible; IteraBot/1.0; +https://maximizeenfermagem.com.br)',
        locale: 'pt-BR',
      });
      const page = await context.newPage();

      // Camada 3: PDFs vistos no tráfego de rede (content-type).
      const networkPdfs = new Set<string>();
      page.on('response', (response) => {
        const contentType = response.headers()['content-type'] ?? '';
        if (contentType.includes('application/pdf')) {
          networkPdfs.add(response.url());
        }
      });

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      await page
        .waitForLoadState('networkidle', { timeout: NAVIGATION_TIMEOUT_MS })
        .catch(() => {
          // networkidle pode nunca chegar em páginas com polling — segue com o que tiver.
        });
      await page.waitForTimeout(POST_LOAD_SETTLE_MS);

      const domLinks = await this.collectDomPdfLinks(page);

      const seen = new Set<string>();
      const pdfLinks: ExtractedPdfLink[] = [];
      for (const link of domLinks) {
        if (seen.has(link.url)) continue;
        seen.add(link.url);
        pdfLinks.push(link);
      }
      for (const networkUrl of networkPdfs) {
        if (seen.has(networkUrl)) continue;
        seen.add(networkUrl);
        pdfLinks.push({ url: networkUrl, label: null, source: 'network' });
      }

      const result: PdfExtractionResult = {
        pageUrl: url,
        finalUrl: page.url(),
        pageTitle: await page.title(),
        pdfLinks,
        extractedAt: new Date().toISOString(),
      };

      this.logger.log(
        `Extracted ${pdfLinks.length} PDF link(s) from ${url}`,
      );

      return result;
    } finally {
      await browser?.close();
    }
  }

  /** Camadas 1 e 2: varre o DOM já renderizado atrás de links/embeds de PDF. */
  private collectDomPdfLinks(page: Page): Promise<ExtractedPdfLink[]> {
    return page.evaluate(() => {
      const isPdfUrl = (raw: string): boolean => {
        try {
          const u = new URL(raw, window.location.href);
          const path = u.pathname.toLowerCase();
          return (
            path.endsWith('.pdf') ||
            u.search.toLowerCase().includes('.pdf') ||
            path.includes('.pdf')
          );
        } catch {
          return false;
        }
      };

      const toAbsolute = (raw: string): string =>
        new URL(raw, window.location.href).href;

      const links: {
        url: string;
        label: string | null;
        source: 'anchor' | 'embed';
      }[] = [];

      document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        if (!href || !isPdfUrl(href)) return;
        links.push({
          url: toAbsolute(href),
          label: a.textContent?.trim() || a.getAttribute('title') || null,
          source: 'anchor',
        });
      });

      document
        .querySelectorAll<HTMLElement>('embed[src], iframe[src], object[data]')
        .forEach((el) => {
          const raw = el.getAttribute('src') ?? el.getAttribute('data');
          if (!raw || !isPdfUrl(raw)) return;
          links.push({
            url: toAbsolute(raw),
            label: el.getAttribute('title') ?? null,
            source: 'embed',
          });
        });

      return links;
    });
  }
}
