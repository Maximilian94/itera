import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { jsonrepair } from 'jsonrepair';
import { decodeHtmlBody } from '../common/decode-body';
import { PrismaService } from '../prisma/prisma.service';

export const SCRAPED_DOCUMENT_KINDS = [
  'EDITAL_ABERTURA',
  'RETIFICACAO',
  'GABARITO',
  'RESULTADO',
  'CONVOCACAO',
  'COMUNICADO',
  'OUTRO',
] as const;

export type ScrapedDocumentKind = (typeof SCRAPED_DOCUMENT_KINDS)[number];

export interface ScrapedDocument {
  /** Nome do documento como aparece na página */
  name: string;
  /** Resumo curto (1 frase) do que é o documento — gerado pela IA */
  summary: string | null;
  /** URL absoluta do documento (resolvida contra a página de origem) */
  url: string | null;
  /** Data de publicação em ISO 8601 (YYYY-MM-DD), null se a página não informa */
  publishedAt: string | null;
  /** Classificação do documento (edital de abertura, retificação etc.) */
  kind: ScrapedDocumentKind;
}

export interface DocumentScrapeResult {
  sourceUrl: string;
  fetchedAt: string;
  documents: ScrapedDocument[];
}

/** Página baixada, normalizada entre o fetch nativo e o fallback got-scraping. */
interface FetchedPage {
  ok: boolean;
  status: number;
  contentType: string;
  buffer: Buffer;
}

/** chromium do playwright-extra: o BrowserType do playwright + `.use(plugin)`. */
type StealthChromium = (typeof import('playwright'))['chromium'] & {
  use: (plugin: unknown) => void;
};

const SYSTEM_PROMPT = `
Você é um assistente especializado em extrair listas de documentos de páginas de concursos públicos brasileiros (páginas de bancas, prefeituras, órgãos e diários oficiais).

Você receberá o HTML simplificado de uma página que lista documentos: editais, retificações, comunicados, gabaritos, resultados, anexos, convocações etc.

Extraia TODOS os documentos listados na página. Para cada documento, retorne:
- name: o nome/título do documento exatamente como aparece na página (ex: "Edital de Abertura nº 01/2024", "Retificação 02 - Cronograma")
- summary: uma frase curta (máximo ~140 caracteres) explicando, em português claro, o que é o documento e para que serve (ex: "Edital de abertura com regras, cargos, vagas e cronograma do concurso.", "Retificação que altera o cronograma e prorroga as inscrições."). Baseie-se no nome e no tipo do documento; null só se não der para inferir nada.
- url: o valor do atributo href do link do documento, EXATAMENTE como está no HTML (não invente, não normalize, não complete domínio). null se o item não tem link.
- publishedAt: a data de publicação/divulgação do documento no formato ISO 8601 "YYYY-MM-DD". A data costuma aparecer ao lado do nome, na mesma linha/célula da tabela, ou como prefixo (ex: "10/05/2024 - Edital..."). Datas brasileiras estão em DD/MM/YYYY — converta corretamente. null se não houver data associada ao documento.
- kind: a classificação do documento, EXATAMENTE um destes valores:
  - "EDITAL_ABERTURA": o edital de abertura/regulamento do concurso (ex: "Edital de Abertura nº 01/2024", "Edital Normativo"). NÃO inclui retificações nem outros editais (convocação, resultado).
  - "RETIFICACAO": retificações, erratas e alterações do edital.
  - "GABARITO": gabaritos preliminares/definitivos.
  - "RESULTADO": resultados, classificações, notas, homologações.
  - "CONVOCACAO": convocações e locais/horários de prova.
  - "COMUNICADO": comunicados, avisos e esclarecimentos.
  - "OUTRO": qualquer outro documento.

Regras:
- Inclua apenas documentos (arquivos, publicações), não links de navegação do site (menu, "voltar", redes sociais, login, política de privacidade etc.).
- Não deduplique nem reordene: preserve a ordem em que os documentos aparecem na página.
- Se a página não contém nenhum documento, retorne uma lista vazia.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações, no formato:
{"documents":[{"name":"...","summary":"...","url":"...","publishedAt":"2024-05-10","kind":"EDITAL_ABERTURA"}]}
`.trim();

@Injectable()
export class DocumentScraperService {
  private readonly logger = new Logger(DocumentScraperService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * "Verificar novas publicações" (aba Notícias): re-raspa a página de origem
   * do concurso (ou usa o HTML colado, p/ sites Cloudflare) e marca cada
   * documento como novo/existente comparando por URL com o que já está salvo.
   * Não persiste nada — só devolve o diagnóstico p/ o admin escolher o que add.
   */
  async checkConcursoDocuments(
    concursoId: string,
    opts: { sourceUrl?: string; html?: string } = {},
  ): Promise<{
    sourceUrl: string;
    checkedAt: string;
    documents: (ScrapedDocument & { isNew: boolean })[];
  }> {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: { id: true, documentsSourceUrl: true },
    });
    if (!concurso) throw new NotFoundException('concurso not found');

    const overrideUrl = opts.sourceUrl?.trim();
    // `overrideUrl ?? ...` não serve: '' (trim vazio) precisa cair no fallback.
    const sourceUrl =
      overrideUrl && overrideUrl.length > 0
        ? overrideUrl
        : concurso.documentsSourceUrl;
    if (!sourceUrl) {
      throw new BadRequestException(
        'Este concurso não tem página de origem cadastrada. Informe a URL da página de publicações.',
      );
    }

    const existing = await this.prisma.concursoDocument.findMany({
      where: { concursoId },
      select: { url: true },
    });
    const existingUrls = new Set(existing.map((d) => d.url));

    const scrape = opts.html
      ? await this.scrapeDocumentsFromHtml(opts.html, sourceUrl)
      : await this.scrapeDocuments(sourceUrl);

    // Registra a verificação (data + origem informada, se veio).
    const checkedAt = new Date();
    await this.prisma.concurso.update({
      where: { id: concursoId },
      data: {
        documentsCheckedAt: checkedAt,
        ...(overrideUrl && overrideUrl !== concurso.documentsSourceUrl
          ? { documentsSourceUrl: overrideUrl }
          : {}),
      },
    });

    return {
      sourceUrl,
      checkedAt: checkedAt.toISOString(),
      documents: scrape.documents.map((d) => ({
        ...d,
        isNew: d.url != null && !existingUrls.has(d.url),
      })),
    };
  }

  /**
   * Adiciona (upsert por concursoId+url) os documentos escolhidos pelo admin à
   * timeline de Notícias. Idempotente — repetir não duplica.
   */
  async addConcursoDocuments(
    concursoId: string,
    documents: {
      title: string;
      summary?: string | null;
      url: string;
      kind?: string | null;
      publishedAt?: string | null;
    }[],
  ): Promise<{ addedCount: number }> {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: { id: true, documentsSourceUrl: true },
    });
    if (!concurso) throw new NotFoundException('concurso not found');

    let addedCount = 0;
    for (const doc of documents) {
      const url = doc.url?.trim();
      if (!url) continue;
      const title = doc.title?.trim();
      const summary = doc.summary?.trim();
      const kind = doc.kind?.trim();
      const data = {
        title: title && title.length > 0 ? title : url,
        summary: summary && summary.length > 0 ? summary : null,
        kind: kind && kind.length > 0 ? kind : 'OUTRO',
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
        sourceUrl: concurso.documentsSourceUrl,
      };
      await this.prisma.concursoDocument.upsert({
        where: { concursoId_url: { concursoId, url } },
        create: { ...data, url, concursoId },
        update: data,
      });
      addedCount++;
    }
    return { addedCount };
  }

  async scrapeDocuments(url: string): Promise<DocumentScrapeResult> {
    const { html, viaBrowser } = await this.fetchHtml(url);
    let documents = await this.extractDocuments(html);
    this.logger.log(
      `scrape ${url}: ${documents.length} doc(s) no HTML ${viaBrowser ? 'renderizado' : 'estático'} (${html.length} chars)`,
    );

    // Lista vazia num HTML que NÃO veio do navegador quase sempre é página
    // renderizada por JS (200 com shell vazio, ou documentos dentro de iframe):
    // força um render com Chromium (que roda o JS e junta os iframes) e
    // re-extrai. Evita a 2ª rodada quando o navegador já foi usado.
    if (documents.length === 0 && !viaBrowser) {
      const rendered = await this.renderWithBrowser(url);
      if (rendered?.html.trim()) {
        documents = await this.extractDocuments(rendered.html);
        this.logger.log(
          `scrape ${url}: re-extração com navegador → ${documents.length} doc(s) (${rendered.html.length} chars)`,
        );
      }
    }

    return {
      sourceUrl: url,
      fetchedAt: new Date().toISOString(),
      documents: documents.map((doc) => ({
        ...doc,
        url: this.resolveUrl(doc.url, url),
      })),
    };
  }

  /**
   * Fallback anti-bot definitivo: o admin abre a página no próprio navegador
   * (passa Cloudflare/desafios como humano), copia o HTML e cola aqui — a IA
   * extrai igual. `sourceUrl` resolve hrefs relativos e vira a origem gravada.
   */
  async scrapeDocumentsFromHtml(
    html: string,
    sourceUrl: string,
  ): Promise<DocumentScrapeResult> {
    const documents = await this.extractDocuments(html);
    this.logger.log(
      `scrape (HTML colado) ${sourceUrl}: ${documents.length} doc(s) de ${html.length} chars`,
    );
    return {
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      documents: documents.map((doc) => ({
        ...doc,
        url: this.resolveUrl(doc.url, sourceUrl),
      })),
    };
  }

  /** Simplifica o HTML e extrai a lista com a IA ([] se não sobrar conteúdo). */
  private async extractDocuments(html: string): Promise<ScrapedDocument[]> {
    const simplified = this.simplifyHtml(html);
    if (!simplified.trim()) return [];
    return this.extractWithAi(simplified);
  }

  /**
   * Baixa o HTML da página com headers de navegador real — muitas páginas de
   * bancas/órgãos bloqueiam User-Agents genéricos ou requests sem headers.
   */
  private async fetchHtml(
    url: string,
  ): Promise<{ html: string; viaBrowser: boolean }> {
    let page: FetchedPage;
    let viaBrowser = false;
    try {
      page = await this.toPage(await this.getPage(url));

      // Muitos WAFs (comuns em bancas/órgãos BR) devolvem 403/429 na 1ª visita,
      // setam um cookie de "desafio" e só liberam quando ele volta. O fetch do
      // Node não guarda cookies sozinho: aquecemos a origem para coletá-los e
      // reenviamos o request com Cookie + Referer da própria origem.
      if (page.status === 403 || page.status === 429) {
        const cookie = await this.warmupCookies(url);
        if (cookie) {
          page = await this.toPage(
            await this.getPage(url, {
              cookie,
              referer: new URL(url).origin + '/',
            }),
          );
        }
      }
    } catch (err) {
      if ((err as Error).name === 'TimeoutError') {
        throw new BadRequestException(
          'A página demorou mais de 30s para responder — o site pode estar lento ou bloqueando acesso automatizado. Tente novamente.',
        );
      }
      throw new BadRequestException(
        `Não foi possível conectar à URL: ${(err as Error).message?.slice(0, 200)}`,
      );
    }

    // WAFs mais duros (fingerprint de TLS) barram o fetch puro. O got-scraping
    // gera headers e um comportamento de navegador mais fiéis (http2, ordem de
    // headers, TLS) — passa por boa parte deles.
    if (page.status === 403 || page.status === 429) {
      const viaGotScraping = await this.fetchViaGotScraping(url);
      if (viaGotScraping) page = viaGotScraping;
    }

    // Último recurso: desafio-JS (Cloudflare et al.) só cai com um navegador de
    // verdade. Chromium headless + stealth renderiza a página (roda o JS do
    // desafio) e devolve o HTML final. É caro (~5-10s) — por isso só aqui.
    if (page.status === 403 || page.status === 429) {
      const rendered = await this.renderWithBrowser(url);
      if (rendered) {
        // Um desafio devolve 403 na 1ª resposta mas o JS carrega a página real
        // depois: aceitamos como sucesso se veio HTML substancial.
        const ok =
          (rendered.status >= 200 && rendered.status < 300) ||
          rendered.html.trim().length > 800;
        page = {
          ok,
          status: ok ? 200 : rendered.status,
          contentType: 'text/html; charset=utf-8',
          buffer: Buffer.from(rendered.html, 'utf8'),
        };
        if (ok) viaBrowser = true;
      }
    }

    if (!page.ok) {
      throw new BadRequestException(
        page.status === 403 || page.status === 429
          ? `O site bloqueou o acesso automatizado (HTTP ${page.status}). Esse órgão provavelmente exige navegação humana (proteção anti-robô forte). Baixe o edital em PDF e crie o concurso direto em /admin/criar-concurso colando a URL do PDF.`
          : `Falha ao buscar a URL (HTTP ${page.status}).`,
      );
    }

    if (page.contentType.includes('application/pdf')) {
      throw new BadRequestException(
        'A URL aponta diretamente para um PDF, não para uma página com lista de documentos.',
      );
    }

    // Decodificação charset-aware: páginas de órgãos em ISO-8859-1 viravam
    // mojibake ("P�BLICO") quando lidas como UTF-8.
    return { html: decodeHtmlBody(page.buffer, page.contentType), viaBrowser };
  }

  /** Normaliza uma Response do fetch numa forma comum ao fallback got-scraping. */
  private async toPage(res: Response): Promise<FetchedPage> {
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      buffer: Buffer.from(await res.arrayBuffer()),
    };
  }

  /** Headers de navegador real + Cookie/Referer opcionais (2ª tentativa). */
  private browserHeaders(opts: { cookie?: string; referer?: string } = {}) {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': opts.referer ? 'same-origin' : 'none',
      'Sec-Fetch-User': '?1',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
      ...(opts.referer ? { Referer: opts.referer } : {}),
    };
  }

  private getPage(
    url: string,
    opts: { cookie?: string; referer?: string } = {},
  ): Promise<Response> {
    return fetch(url, {
      redirect: 'follow',
      // Sem timeout, um site que "pendura" a conexão trava o request para
      // sempre (o admin fica com o spinner infinito).
      signal: AbortSignal.timeout(30_000),
      headers: this.browserHeaders(opts),
    });
  }

  /**
   * Visita a raiz da origem para colher os cookies do WAF (Set-Cookie) e os
   * devolve como header Cookie "name=value; name2=value2". Best-effort: falha
   * silenciosa vira string vazia (a chamada segue sem cookie).
   */
  private async warmupCookies(url: string): Promise<string> {
    try {
      const origin = new URL(url).origin;
      const res = await this.getPage(origin + '/');
      const setCookies = res.headers.getSetCookie();
      const jar = setCookies
        .map((c) => c.split(';')[0].trim())
        .filter((c) => c.includes('='));
      return jar.join('; ');
    } catch {
      return '';
    }
  }

  /**
   * Carrega um pacote fora do bundle do webpack: o import() fica escondido num
   * Function constructor (string literal fixa, não input do usuário) para o
   * webpack não tentar empacotá-lo; no runtime o Node faz o import dinâmico de
   * verdade — necessário p/ got-scraping (ESM-only) e p/ manter o playwright
   * (drivers/binários) fora do bundle.
   */
  private esmImport<T>(specifier: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string,
    ) => Promise<T>;
    return dynamicImport(specifier);
  }

  private gotScrapingLoader?: Promise<
    (typeof import('got-scraping'))['gotScraping']
  >;

  /** got-scraping é ESM-only; carregado uma vez (lazy) e só quando preciso. */
  private loadGotScraping() {
    this.gotScrapingLoader ??= this.esmImport<typeof import('got-scraping')>(
      'got-scraping',
    ).then((m) => m.gotScraping);
    return this.gotScrapingLoader;
  }

  /**
   * Fallback contra WAFs que barram o fetch puro: o got-scraping imita um
   * navegador (headers gerados, http2, TLS). Best-effort — qualquer falha vira
   * null e o chamador cai na mensagem de bloqueio.
   */
  private async fetchViaGotScraping(url: string): Promise<FetchedPage | null> {
    try {
      const gotScraping = await this.loadGotScraping();
      const res = await gotScraping({
        url,
        responseType: 'buffer',
        throwHttpErrors: false,
        timeout: { request: 30_000 },
        retry: { limit: 1 },
        headerGeneratorOptions: {
          browsers: [{ name: 'chrome', minVersion: 120 }],
          devices: ['desktop'],
          operatingSystems: ['windows'],
          locales: ['pt-BR'],
        },
      });
      return {
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        contentType: String(res.headers['content-type'] ?? ''),
        buffer: Buffer.isBuffer(res.body)
          ? res.body
          : Buffer.from(res.rawBody ?? []),
      };
    } catch (err) {
      this.logger.warn(
        `got-scraping falhou para ${url}: ${(err as Error).message?.slice(0, 200)}`,
      );
      return null;
    }
  }

  private stealthChromiumLoader?: Promise<StealthChromium>;

  /** playwright-extra + plugin stealth (CJS), carregados fora do bundle. */
  private loadStealthChromium() {
    this.stealthChromiumLoader ??= (async () => {
      const pe = await this.esmImport<{
        chromium?: StealthChromium;
        default?: { chromium?: StealthChromium };
      }>('playwright-extra');
      const chromium = pe.chromium ?? pe.default?.chromium;
      if (!chromium) throw new Error('playwright-extra sem export chromium');
      const stealthMod = await this.esmImport<
        { default?: () => unknown } & (() => unknown)
      >('puppeteer-extra-plugin-stealth');
      const stealthFactory = stealthMod.default ?? stealthMod;
      chromium.use(stealthFactory());
      return chromium;
    })();
    return this.stealthChromiumLoader;
  }

  /**
   * Renderiza a página num Chromium headless com stealth: roda o JS (desafio
   * anti-bot E listas montadas por JavaScript) e junta o HTML de TODOS os
   * frames — listas embutidas em `<iframe>` são comuns em sites de banca e
   * somem no HTML estático. Best-effort — qualquer falha (browser não
   * instalado, timeout) vira null.
   */
  private async renderWithBrowser(
    url: string,
  ): Promise<{ status: number; html: string } | null> {
    let browser: import('playwright').Browser | undefined;
    try {
      const chromium = await this.loadStealthChromium();
      // Headful (janela real) passa MUITO mais no desafio gerenciado do
      // Cloudflare que o headless — no dev local vale ligar SCRAPER_HEADFUL=true.
      const headful = this.config.get<string>('SCRAPER_HEADFUL') === 'true';
      browser = await chromium.launch({
        headless: !headful,
        // --no-sandbox: necessário quando roda como root (Docker/CI).
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const context = await browser.newContext({
        locale: 'pt-BR',
        viewport: { width: 1366, height: 768 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();
      const resp = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      // Cloudflare "Just a moment...": espera o desafio limpar (recarrega para a
      // página real) em vez de snapshotar a própria página de desafio.
      await this.waitForChallenge(page, url);
      // Dá tempo p/ o desafio-JS resolver e a lista assíncrona carregar.
      await page
        .waitForLoadState('networkidle', { timeout: 15_000 })
        .catch(() => undefined);
      // Scroll até o fim dispara carregamentos lazy (listas paginadas/infinitas).
      await page
        .evaluate('window.scrollTo(0, document.body.scrollHeight)')
        .catch(() => undefined);
      await page
        .waitForLoadState('networkidle', { timeout: 5_000 })
        .catch(() => undefined);
      // Junta o frame principal + iframes (o page.content() do principal traz o
      // <iframe> vazio; o conteúdo real mora no content() de cada child frame).
      const frames = page.frames();
      const parts = await Promise.all(
        frames.map((f) => f.content().catch(() => '')),
      );
      const html = parts.filter((p) => p.trim()).join('\n');
      this.logger.log(
        `render ${url}: HTTP ${resp?.status() ?? '?'}, ${frames.length} frame(s), ${html.length} chars`,
      );
      return { status: resp?.status() ?? 200, html };
    } catch (err) {
      this.logger.warn(
        `playwright falhou para ${url}: ${(err as Error).message?.slice(0, 200)}`,
      );
      return null;
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }

  /**
   * Espera um interstício anti-bot (Cloudflare "Just a moment...", "Verificando
   * seu navegador") sumir. O desafio JS recarrega para a página real quando
   * passa; ficamos observando o título até ~30s. Se não passar (headless
   * detectado, ou CAPTCHA interativo), segue e devolve o que houver.
   */
  private async waitForChallenge(
    page: import('playwright').Page,
    url: string,
  ): Promise<void> {
    const CHALLENGE =
      /just a moment|verifying|verificando|attention required|um momento|checking your browser/i;
    const title = await page.title().catch(() => '');
    if (!CHALLENGE.test(title)) return;

    this.logger.log(`render ${url}: desafio anti-bot detectado, aguardando...`);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2_000);
      const current = await page.title().catch(() => '');
      if (!CHALLENGE.test(current)) {
        this.logger.log(`render ${url}: desafio resolvido`);
        return;
      }
    }
    this.logger.warn(
      `render ${url}: desafio anti-bot NÃO resolvido em 30s (provável Cloudflare headless).`,
    );
  }

  /**
   * Reduz o HTML ao essencial antes de mandar para a IA: remove scripts,
   * estilos e atributos irrelevantes (mantendo href), cortando o custo de
   * tokens sem perder a estrutura de links/datas.
   */
  private simplifyHtml(html: string): string {
    const $ = cheerio.load(html);

    $(
      'script, style, noscript, svg, iframe, link, meta, head, img, video, picture, source, form input[type="hidden"]',
    ).remove();

    const keptAttrs = new Set(['href', 'datetime', 'title', 'download']);
    $('*').each((_i, el) => {
      const $el = $(el);
      const attribs = $el.attr() ?? {};
      for (const name of Object.keys(attribs)) {
        if (!keptAttrs.has(name)) $el.removeAttr(name);
      }
    });

    // Junta TODOS os <body> (o HTML renderizado pode concatenar vários frames,
    // cada um com o seu); sem body (fragmento), cai no documento inteiro.
    const bodies = $('body')
      .map((_i, el) => $(el).html() ?? '')
      .get()
      .join(' ');
    const body = bodies.trim() ? bodies : ($.root().html() ?? '');
    // Colapsa whitespace excessivo (páginas de órgãos costumam vir cheias de indentação)
    const compact = body.replace(/\s+/g, ' ').replace(/> </g, '><').trim();

    // ~200k chars ≈ 50k tokens — folga no contexto do modelo, mas evita páginas patológicas
    return compact.slice(0, 200_000);
  }

  private async extractWithAi(
    simplifiedHtml: string,
  ): Promise<ScrapedDocument[]> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'OPENAI_API_KEY não configurada. Configure-a no .env.',
      );
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(120_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: 16_384,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: simplifiedHtml },
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
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch {
        this.logger.error(
          `Resposta da IA não é JSON válido: ${jsonStr.slice(0, 500)}`,
        );
        throw new BadRequestException(
          'A IA retornou uma resposta inválida ao extrair os documentos.',
        );
      }
    }

    const documents = (parsed as { documents?: unknown })?.documents;
    if (!Array.isArray(documents)) {
      throw new BadRequestException(
        'A IA não retornou a lista de documentos no formato esperado.',
      );
    }

    return documents
      .filter(
        (
          d,
        ): d is {
          name: string;
          summary?: unknown;
          url?: unknown;
          publishedAt?: unknown;
        } =>
          typeof d === 'object' &&
          d != null &&
          typeof (d as { name?: unknown }).name === 'string' &&
          !!(d as { name: string }).name.trim(),
      )
      .map((d) => ({
        name: d.name.trim(),
        summary:
          typeof d.summary === 'string' && d.summary.trim()
            ? d.summary.trim()
            : null,
        url: typeof d.url === 'string' && d.url.trim() ? d.url.trim() : null,
        publishedAt:
          typeof d.publishedAt === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(d.publishedAt)
            ? d.publishedAt.slice(0, 10)
            : null,
        kind: SCRAPED_DOCUMENT_KINDS.includes(
          (d as { kind?: unknown }).kind as ScrapedDocumentKind,
        )
          ? ((d as { kind?: unknown }).kind as ScrapedDocumentKind)
          : 'OUTRO',
      }));
  }

  /** Resolve hrefs relativos contra a URL da página de origem. */
  private resolveUrl(href: string | null, baseUrl: string): string | null {
    if (!href) return null;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }
}
