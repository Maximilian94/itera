import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConcursoAiPhase, GovernmentScope, Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { jsonrepair } from 'jsonrepair';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoCostService } from './concurso-cost.service';
import { ConcursoLinkService } from '../concurso/concurso-link.service';
import { deriveConcursoStatus } from '../concurso/concurso-status';
import type { ConcursoStatus } from '../concurso/concurso-status';
import {
  DocumentScraperService,
  PageFetchError,
  VERIFY_SCRAPE,
} from './document-scraper.service';
import { AiUsageMeter } from '../common/ai-cost';
import type { CostEntry, CostReport } from '../common/ai-cost';

const PCI_BASE_URL = 'https://www.pciconcursos.com.br';

/** Um concurso listado na página de cargo do pciconcursos (antes da dedupe). */
export interface DiscoveryCandidate {
  /** Instituição/órgão (sem o sufixo " - UF"), ex.: "Prefeitura de Santos". */
  institution: string;
  /** UF de 2 letras extraída do rótulo, null se não veio. */
  uf: string | null;
  /** Manchete completa (atributo title do link). */
  headline: string;
  /** URL absoluta da notícia no pciconcursos — identificador estável do concurso. */
  newsUrl: string;
}

/** Candidato + situação em relação à base (novo × já cadastrado). */
export interface ClassifiedCandidate extends DiscoveryCandidate {
  status: 'new' | 'exists';
  matched: { id: string; slug: string | null } | null;
}

export interface DiscoverySearchResult {
  cargoSlug: string;
  fetchedAt: string;
  candidates: ClassifiedCandidate[];
}

export interface DiscoveryAddResult {
  concurso: { id: string; slug: string | null; institution: string };
  /** true se o link oficial da organizadora foi encontrado e salvo. */
  officialUrlFound: boolean;
  /** false quando o concurso já existia (idempotência). */
  created: boolean;
}

/** Resultado da fase 2 — o que a notícia do pciconcursos deu sobre o concurso. */
export interface NewsExtractResult {
  concursoId: string;
  /** false quando a notícia não pôde ser lida (bloqueio, página vazia). */
  extracted: boolean;
  /** Campos que a extração de fato preencheu, para a UI dizer o que mudou. */
  filled: string[];
  cost: CostReport;
}

/** Linha da listagem admin de concursos. */
export interface AdminConcursoRow {
  id: string;
  slug: string | null;
  institution: string;
  state: string | null;
  year: number;
  status: ConcursoStatus;
  provaCount: number;
  /** true quando não há link oficial nem edital — precisa de captura manual. */
  needsSourceUrl: boolean;
  /** true quando encerrado manualmente (closedAt) — sai da "atenção". */
  closed: boolean;
  /** Última verificação de novas publicações (ISO); null = nunca verificado. */
  documentsCheckedAt: string | null;
  registrationEnd: string | null;
  createdAt: string;
  /** Fase 6: visível ao usuário final. false = rascunho, só o admin vê. */
  published: boolean;
  /** Tem notícia de origem — pré-requisito da fase 2. */
  hasNewsUrl: boolean;
  hasEditalUrl: boolean;
  documentCount: number;
  /** Custo de IA acumulado; null quando nunca foi medido (≠ US$ 0). */
  aiCostUsd: number | null;
}

/** Resultado do 2º salto: o link do concurso, ou a pista que não abrimos. */
interface HopResult {
  concursoUrl: string | null;
  /** Página (listagem/plataforma) identificada mas ilegível — vira pista. */
  deadEnd: string | null;
}
const NO_HOP: HopResult = { concursoUrl: null, deadEnd: null };

/** Link que a busca achou mas NÃO conseguiu confirmar — vai para o admin. */
export interface LinkSuggestion {
  url: string;
  /** De onde veio: link copiado do site da banca × composto pela busca web. */
  origin: 'site da banca' | 'busca web' | 'plataforma da organizadora';
}

/** Resultado da procura: confirmado, ou uma sugestão para o admin decidir. */
export interface LinkSearchOutcome {
  confirmed: { url: string; docCount: number; verified: boolean } | null;
  suggestion: LinkSuggestion | null;
}

/** Identidade do concurso usada para localizar sua página oficial. */
interface ConcursoIdentity {
  institution: string;
  uf: string | null;
  city: string | null;
  year: number | null;
  /** Manchete/nome do concurso (dá contexto extra à busca), opcional. */
  headline?: string | null;
  /** Cargo(s) de enfermagem do concurso — desempata quando o órgão tem mais de
   *  um certame no mesmo ano (ex.: Mondaí 2026 tem o Concurso Público 039 SEM
   *  enfermeiro e o Processo Seletivo 043 COM). Sem isso a busca escolhia o que
   *  casava com "concurso público" e trazia o certame errado. */
  targetRoles?: string[];
}

/** O que a IA extrai da página de notícia do concurso (tudo best-effort). */
interface ExtractedNews {
  /** Site da BANCA/organizadora onde as inscrições acontecem (ponto de partida
   *  do 2º salto para achar a página específica do concurso). */
  bancaUrl: string | null;
  editalUrl: string | null;
  year: number | null;
  governmentScope: GovernmentScope | null;
  city: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
}

const NEWS_SYSTEM_PROMPT = `
Você extrai dados estruturados de uma notícia de concurso público brasileiro (do site pciconcursos, que agrega editais).

Retorne SOMENTE um JSON válido, sem markdown, no formato:
{"bancaUrl":"...","editalUrl":"...","year":2026,"governmentScope":"MUNICIPAL","city":"...","registrationStart":"2026-01-10","registrationEnd":"2026-02-10"}

Campos (use null quando a notícia não informar):
- bancaUrl: a URL do SITE DA BANCA/ORGANIZADORA onde as inscrições são feitas — normalmente aparece na frase "as inscrições serão recebidas pelo site X" ou "inscrições pelo site X". Prefira o site da BANCA (ex.: uma "...concursos.org.br", "instituto...", "fundacao...", "cebraspe", "fgv", "vunesp") ao site do próprio órgão/prefeitura. NUNCA use uma URL de "pciconcursos.com.br" (é o agregador). Se só houver o site do órgão, use-o.
- editalUrl: link direto do arquivo do edital (geralmente .pdf), se aparecer. Também não pode ser pciconcursos.com.br.
- year: o ano do concurso (número).
- governmentScope: EXATAMENTE um de "MUNICIPAL" (prefeituras, câmaras municipais), "STATE" (governo/secretaria de estado, órgãos estaduais) ou "FEDERAL" (união, órgãos federais, universidades federais).
- city: o município, quando for concurso municipal.
- registrationStart / registrationEnd: início e fim das inscrições no formato ISO "YYYY-MM-DD". Datas brasileiras vêm em DD/MM/AAAA — converta.
`.trim();

const BANCA_SYSTEM_PROMPT = `
Você recebe o texto e os links de uma PÁGINA de um site de banca/organizadora de concursos públicos. Sua tarefa é achar o link da PÁGINA ESPECÍFICA de UM concurso.

Retorne SOMENTE um JSON válido, sem markdown: {"concursoUrl":"...","listingUrl":"..."} (use null quando não houver).

- concursoUrl: a URL da página DESTE concurso específico (a que tem o edital, cronograma e inscrição do órgão informado). O link costuma conter o nome do órgão/cidade, o ano, ou palavras como "concurso", "edital", "processo-seletivo", "inscricao". Escolha o link que MELHOR corresponde ao órgão/cidade/ano informados pelo usuário.
- listingUrl: só quando NÃO houver concursoUrl nesta página. É o link da página que LISTA os concursos da banca ("Concursos", "Próximos concursos", "Em andamento", "Inscrições abertas", "Processos seletivos"), onde o concurso procurado provavelmente aparece. A home da banca raramente lista os concursos — quase sempre há uma página dedicada.
- NÃO invente URL: use apenas links presentes na página. Sem nada que sirva, retorne null nos dois campos.
`.trim();

/** Busca web (Responses API + tool web_search) da PÁGINA DE DOCUMENTOS do concurso. */
const WEBSEARCH_SYSTEM_PROMPT = `
Você localiza a PÁGINA DE DOCUMENTOS de um concurso público brasileiro específico.

O alvo é UMA URL: a página onde estão PUBLICADOS OS DOCUMENTOS deste concurso — edital de abertura, retificações, anexos, convocações, gabaritos e resultados. É a página de onde um candidato BAIXA os editais e faz a inscrição.

ONDE ELA PODE ESTAR — não presuma o domínio, SIGA a fonte:
- no site da BANCA organizadora (institutoaocp.org.br, ibfc.org.br, vunesp.com.br, cebraspe.org.br, fgv.br, quadrix.org.br, fundatec.org.br, idecan.org.br, consulplan.net, objetivas.com.br...); OU
- numa PLATAFORMA TERCEIRA de inscrições que a banca contrata — MUITO comum em bancas pequenas, institutos e associações de municípios. O endereço costuma ser um SUBDOMÍNIO da plataforma, por exemplo "<banca>.selecao.net.br", ou um portal tipo gestaodeconcursos.com.br. Nesses casos o site próprio da banca NÃO tem a página do concurso; OU
- no site do próprio ÓRGÃO/prefeitura, quando ele mesmo organiza.

REGRA CENTRAL: siga o link de "inscrição"/"edital" que a notícia ou o site da banca indicar, MESMO QUE ELE LEVE A OUTRO DOMÍNIO. O domínio do órgão ou da banca não é garantia de nada.

NÃO retorne:
- HOME "pelada" (só o domínio, sem caminho específico do concurso) — lá não ficam os editais;
- página de notícia, de login, agregador (PCI Concursos, Gran, Estratégia, QConcursos etc.) nem o PDF solto do edital.

Como agir:
- PESQUISE na internet. Descubra quem organiza e ONDE as inscrições/documentos deste concurso realmente estão.
- Confirme que a página é DESTE órgão e DESTE ano, e que ela lista documentos ou abre as inscrições.
- Use um endereço que você VIU na fonte. NÃO deduza o padrão de URL do site nem componha um caminho "provável" — endereços inventados dão 404 e são o erro mais caro aqui.
- Remova parâmetros de rastreamento (utm_*, fbclid...).
- Não achou a página específica? Responda "NOT_FOUND". É melhor que um palpite.

Responda SOMENTE com um JSON válido, sem markdown, sem texto antes ou depois:
{"officialContestUrl":"https://...","organizerUrl":"https://..."}
- officialContestUrl: a PÁGINA DE DOCUMENTOS/INSCRIÇÃO específica deste concurso, no domínio em que ela de fato estiver (resposta principal). "NOT_FOUND" se não achar.
- organizerUrl: a HOME do site da organizadora OU da plataforma de inscrições, se você a identificou (referência para uma segunda busca). "NOT_FOUND" se não souber.
`.trim();

/**
 * A OpenAI recusou a chamada por conta/chave (401 sem autorização, 429 sem
 * crédito), não por causa do conteúdo. Erro de INFRAESTRUTURA — precisa subir
 * até a tela: tratá-lo como "não achei o link" fazia a plataforma degradar em
 * silêncio para "pegar manual" em TODOS os concursos, e a causa real (crédito
 * acabado) só aparecia no log do servidor.
 */
export class OpenAiUnavailableError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(
      `A busca por IA não rodou: a OpenAI recusou a chamada (HTTP ${status}). ` +
        (status === 429
          ? 'Provavelmente a conta está sem créditos. '
          : status === 401
            ? 'Verifique a OPENAI_API_KEY. '
            : '') +
        detail.slice(0, 200),
    );
    this.name = 'OpenAiUnavailableError';
  }
}

/**
 * Domínios de agregadores/cursinhos que NUNCA valem como link oficial.
 *
 * ⚠️ São comparados por DOMÍNIO (igual ou subdomínio), não por "contém". A
 * versão anterior usava um regex de substring com entradas como `concursos.com`
 * e `estrategia`, que casavam dentro do domínio de BANCAS legítimas —
 * `ibgpconcursos.com.br` e `seleconcursos.com.br` eram descartados como
 * agregadores, e com eles o link oficial de todo concurso dessas bancas.
 */
const AGGREGATOR_DOMAINS = [
  'pciconcursos.com.br',
  'acheconcursos.com.br',
  'concursosnobrasil.com.br',
  'grancursos.com.br',
  'grancursosonline.com.br',
  'granconcursos.com.br',
  'estrategiaconcursos.com.br',
  'folhadirigida.com.br',
  'jcconcursos.com.br',
  'qconcursos.com',
  'tecconcursos.com.br',
  'direcaoconcursos.com.br',
  'beabadoconcurso.com.br',
  'pcimarcas.com.br',
  'concursos.com.br',
  'acertaquestoes.com.br',
];

/** true quando o host É um agregador ou subdomínio de um. */
export function isAggregatorHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return AGGREGATOR_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Normaliza um candidato a URL de documentos do concurso: exige http, rejeita
 * agregadores, tira parâmetros de rastreamento e REJEITA home "pelada" (domínio
 * sem caminho) — a home da prefeitura/banca não tem os editais. null = descarta.
 * Função pura (testável).
 */
export function cleanConcursoUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.toUpperCase() === 'NOT_FOUND') return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (isAggregatorHost(u.hostname)) return null;
  // Home sem caminho específico do concurso → quase sempre errada.
  if (u.pathname.replace(/\/+$/, '') === '' && !u.search) return null;
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_)/i.test(key))
      u.searchParams.delete(key);
  }
  return u.toString();
}

/**
 * Chave de comparação entre URLs (host sem "www" + caminho sem barra final,
 * minúsculo, sem query). Serve para checar se a URL que o MODELO escreveu é
 * uma das que a busca realmente devolveu. Função pura (testável).
 */
export function urlKey(v: string): string {
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return host + path;
  } catch {
    return v.trim().toLowerCase();
  }
}

/**
 * URLs REAIS que a busca web devolveu (`url_citation` das annotations). São o
 * antídoto para a alucinação de endereço: o modelo COMPÕE caminhos plausíveis
 * (medimos 3 URLs diferentes e todas 404 para o mesmo concurso), mas as
 * citações vêm do índice de busca. Função pura (testável).
 */
export function extractCitations(data: unknown): string[] {
  const d = data as {
    output?: {
      type?: string;
      content?: { annotations?: { type?: string; url?: unknown }[] }[];
    }[];
  };
  const out: string[] = [];
  for (const item of d.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a.type === 'url_citation' && typeof a.url === 'string')
          out.push(a.url);
      }
    }
  }
  return [...new Set(out)];
}

/**
 * Normaliza uma SEMENTE do 2º salto (o site da banca). Diferente de
 * `cleanConcursoUrl`, **aceita home "pelada"**: como resposta final a home é
 * inútil, mas como ponto de partida para raspar o site da organizadora é
 * exatamente o que queremos. Reduz ao ORIGEM (tira caminho/query) porque o
 * salto começa do topo do site. Função pura (testável).
 */
export function cleanSeedUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.toUpperCase() === 'NOT_FOUND') return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (isAggregatorHost(u.hostname)) return null;
  return u.origin;
}

/**
 * Normaliza o nome de uma instituição para casar candidato × base:
 * minúsculas, sem acento, sem pontuação, colapsa espaços. Não remove
 * "prefeitura de" — o match usa o nome inteiro + UF, então prefixos comuns
 * não geram falso-positivo entre municípios distintos.
 */
/**
 * Extrai o texto final de uma resposta da OpenAI Responses API. Aceita o campo
 * de conveniência `output_text` ou varre `output[].content[].text` do 1º item
 * do tipo "message" (o resto são chamadas da tool web_search).
 */
function extractResponsesText(data: unknown): string | null {
  const d = data as {
    output_text?: unknown;
    output?: {
      type?: string;
      content?: { type?: string; text?: unknown }[];
    }[];
  };
  if (typeof d.output_text === 'string' && d.output_text.trim())
    return d.output_text.trim();
  for (const item of d.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      if (
        (c.type === 'output_text' || c.type === 'text') &&
        typeof c.text === 'string' &&
        c.text.trim()
      )
        return c.text.trim();
    }
  }
  return null;
}

/** Extrai um objeto JSON de um texto (tolera markdown/citações da busca web). */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  let s = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(jsonrepair(s)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export function normalizeInstitution(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Extrai os concursos da página `/cargos/<slug>` do pciconcursos. Cada concurso
 * é um `<a class="noticia_desc">` (dentro de `<ul class="link-d">`): o texto é
 * "Instituição - UF", o `title` é a manchete e o `href` é a página de notícia.
 * Função pura (sem rede) — testada com um trecho salvo do HTML real.
 */
export function parseCandidates(
  html: string,
  baseUrl = PCI_BASE_URL,
): DiscoveryCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const candidates: DiscoveryCandidate[] = [];

  $('a.noticia_desc').each((_i, el) => {
    const $el = $(el);
    const href = $el.attr('href')?.trim();
    if (!href) return;
    const newsUrl = href.startsWith('http')
      ? href
      : new URL(href, baseUrl).toString();
    if (seen.has(newsUrl)) return;

    // O rótulo pode carregar o ícone <small><i/></small>: pega só o texto.
    const label = $el
      .clone()
      .children('small')
      .remove()
      .end()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (!label) return;

    const ufMatch = /-\s*([A-Za-z]{2})\s*$/.exec(label);
    const uf = ufMatch ? ufMatch[1].toUpperCase() : null;
    const institution = (
      ufMatch ? label.slice(0, ufMatch.index).trim() : label
    ).replace(/[-\s]+$/, '');
    if (!institution) return;

    seen.add(newsUrl);
    candidates.push({
      institution,
      uf,
      headline: ($el.attr('title') ?? label).trim(),
      newsUrl,
    });
  });

  return candidates;
}

/** Concurso já na base, na forma mínima usada para dedupe da descoberta. */
export interface ExistingConcursoRef {
  id: string;
  slug: string | null;
  institution: string;
  state: string | null;
  pciListingUrl: string | null;
}

/** `<normalizeInstitution(institution)>|<UF>` — chave de match candidato × base. */
function instKey(institution: string, uf: string | null): string {
  return `${normalizeInstitution(institution)}|${(uf ?? '').toUpperCase()}`;
}

/**
 * Chave de ordenação por "quão parado está": instante da última verificação,
 * crescente (mais antigo primeiro). Nunca verificado vem antes de tudo — é o
 * caso mais urgente da fila de manutenção.
 */
function staleRank(checkedAt: string | null): number {
  return checkedAt == null ? -Infinity : new Date(checkedAt).getTime();
}

/**
 * Cruza os candidatos raspados com os concursos já na base. Um candidato é
 * "exists" quando casa pela URL da notícia (dedupe exato e idempotente) ou pela
 * tupla instituição+UF (cobre concursos criados por outros fluxos, sem a URL).
 * Função pura — testável sem rede/prisma.
 */
export function classifyCandidates(
  candidates: DiscoveryCandidate[],
  existing: ExistingConcursoRef[],
): ClassifiedCandidate[] {
  const byUrl = new Map(
    existing.filter((c) => c.pciListingUrl).map((c) => [c.pciListingUrl!, c]),
  );
  const byInst = new Map(
    existing.map((c) => [instKey(c.institution, c.state), c]),
  );
  return candidates.map((c) => {
    const match =
      byUrl.get(c.newsUrl) ?? byInst.get(instKey(c.institution, c.uf));
    return {
      ...c,
      status: match ? 'exists' : 'new',
      matched: match ? { id: match.id, slug: match.slug } : null,
    };
  });
}

/**
 * "Procurar novos concursos" (/admin/gerenciar-concursos): raspa a página de
 * cargo do pciconcursos, cruza os concursos listados com a base e permite
 * adicionar só os que ainda não existem.
 *
 * ⚠️ O fluxo é **faseado e manual**. `add` (fase 1) NÃO chama IA: cria o
 * concurso como RASCUNHO com o que a listagem já deu (órgão, UF, ano da
 * manchete) e para por aí. As fases caras — ler a notícia (2), achar o link
 * oficial (3), raspar documentos (4), analisar o edital (5) — são botões
 * separados, disparados um a um pelo admin, e cada uma grava o que custou
 * (`ConcursoCostService`). Antes, um clique em "Adicionar" disparava a leitura
 * da notícia + a busca web para cada candidato: adicionar 70 concursos de uma
 * vez custava dezenas de dólares antes de o admin ver o primeiro resultado.
 */
@Injectable()
export class ConcursoDiscoveryService {
  private readonly logger = new Logger(ConcursoDiscoveryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly concursoLink: ConcursoLinkService,
    private readonly docScraper: DocumentScraperService,
    private readonly costs: ConcursoCostService,
  ) {}

  async search(cargoSlug = 'enfermeiro'): Promise<DiscoverySearchResult> {
    const slug = cargoSlug.trim() || 'enfermeiro';
    const html = await this.fetchHtml(`${PCI_BASE_URL}/cargos/${slug}`);
    const candidates = parseCandidates(html);
    this.logger.log(
      `cargos/${slug}: ${candidates.length} concurso(s) na página`,
    );

    const existing = await this.prisma.concurso.findMany({
      select: {
        id: true,
        slug: true,
        institution: true,
        state: true,
        pciListingUrl: true,
      },
    });

    return {
      cargoSlug: slug,
      fetchedAt: new Date().toISOString(),
      candidates: classifyCandidates(candidates, existing),
    };
  }

  /**
   * FASE 1 — cadastro. Cria o concurso como rascunho, sem IA e sem custo, a
   * partir apenas do que a listagem do pciconcursos já trazia. Idempotente.
   */
  async add(candidate: DiscoveryCandidate): Promise<DiscoveryAddResult> {
    const institution = candidate.institution.trim();
    if (!institution)
      throw new BadRequestException('institution é obrigatório');
    const ufTrimmed = candidate.uf?.trim().toUpperCase();
    const uf = ufTrimmed && ufTrimmed.length > 0 ? ufTrimmed : null;

    // Idempotência: já existe pela URL da notícia ou pela tupla instituição+UF.
    const existing = await this.prisma.concurso.findMany({
      select: {
        id: true,
        slug: true,
        institution: true,
        state: true,
        pciListingUrl: true,
      },
    });
    const already =
      existing.find((c) => c.pciListingUrl === candidate.newsUrl) ??
      existing.find(
        (c) => instKey(c.institution, c.state) === instKey(institution, uf),
      );
    if (already) {
      const full = await this.prisma.concurso.findUnique({
        where: { id: already.id },
        select: { documentsSourceUrl: true, editalUrl: true },
      });
      return {
        concurso: {
          id: already.id,
          slug: already.slug,
          institution: already.institution,
        },
        officialUrlFound: !!(full?.documentsSourceUrl ?? full?.editalUrl),
        created: false,
      };
    }

    // Só o que a própria listagem já deu — sem visitar a notícia, sem IA.
    const year =
      this.yearFromText(candidate.headline) ?? new Date().getUTCFullYear();

    const concurso = await this.concursoLink.findOrCreateConcurso({
      institution,
      year,
      governmentScope: this.scopeFromInstitution(institution),
      state: uf,
      city: null,
      examBoardId: null,
      boardLabel: null,
      // Nasce RASCUNHO: existe para o admin trabalhar, invisível ao usuário até
      // a fase 6. Sem isto, um stub sem edital nem data cairia direto no feed
      // de /concursos, que é justamente o que a fase de publicação evita.
      //
      // A flag vai na CRIAÇÃO, não num update depois: `findOrCreateConcurso`
      // pode ter ENCONTRADO um concurso que já existia e estava publicado (a
      // chave dele — instituição+ano+banca — é mais frouxa que a dedupe acima),
      // e despublicá-lo aqui tiraria do ar um concurso real.
      draft: true,
    });

    const updated = await this.prisma.concurso.update({
      where: { id: concurso.id },
      data: {
        pciListingUrl: candidate.newsUrl,
        // NÃO carimba `documentsCheckedAt`: nada foi verificado ainda, e mentir
        // aqui envenena o `checkFreshness` da fila de manutenção.
      },
      select: { id: true, slug: true, institution: true },
    });

    // Cargo default "Enfermeiro" (isNursingRelevant) p/ o concurso aparecer nos
    // agregados de enfermagem e não ficar vazio. Só se ainda não tem cargo.
    const cargoCount = await this.prisma.cargo.count({
      where: { concursoId: concurso.id },
    });
    if (cargoCount === 0) {
      await this.prisma.cargo.create({
        data: {
          concursoId: concurso.id,
          role: 'Enfermeiro',
          isNursingRelevant: true,
        },
      });
    }

    return {
      concurso: updated,
      officialUrlFound: false,
      created: true,
    };
  }

  /**
   * FASE 2 — lê a notícia do pciconcursos que originou o concurso e preenche o
   * que ela souber dizer: banca, link do edital, cidade, escopo e janela de
   * inscrição. Uma chamada barata no mini, medida e registrada.
   *
   * Só preenche campo VAZIO (`??`): a notícia é a fonte mais fraca do fluxo, e
   * uma rodada tardia não pode sobrescrever o que o edital (fase 5) ou o admin
   * já corrigiram à mão.
   */
  async extractNewsForConcurso(concursoId: string): Promise<NewsExtractResult> {
    const c = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: {
        id: true,
        pciListingUrl: true,
        city: true,
        editalUrl: true,
        registrationStart: true,
        registrationEnd: true,
      },
    });
    if (!c) throw new NotFoundException('concurso not found');
    if (!c.pciListingUrl)
      throw new BadRequestException(
        'Este concurso não veio da descoberta (sem notícia de origem) — não há o que extrair.',
      );

    const meter = this.newMeter();
    const extracted = await this.extractFromNews(c.pciListingUrl, meter).catch(
      (err) => {
        // Crédito/chave: erro visível, não "não achei nada".
        if (err instanceof OpenAiUnavailableError) throw err;
        this.logger.warn(
          `extração da notícia falhou (${c.pciListingUrl}): ${(err as Error).message?.slice(0, 160)}`,
        );
        return null;
      },
    );

    const cost = meter.report();
    await this.costs.record(c.id, ConcursoAiPhase.NEWS_EXTRACT, cost);

    if (!extracted)
      return { concursoId: c.id, extracted: false, filled: [], cost };

    const data: Prisma.ConcursoUpdateInput = {};
    const filled: string[] = [];
    if (!c.city && extracted.city) {
      data.city = extracted.city;
      filled.push('cidade');
    }
    if (!c.editalUrl && extracted.editalUrl) {
      data.editalUrl = extracted.editalUrl;
      filled.push('edital');
    }
    if (!c.registrationStart && extracted.registrationStart) {
      data.registrationStart = new Date(extracted.registrationStart);
      filled.push('início das inscrições');
    }
    if (!c.registrationEnd && extracted.registrationEnd) {
      data.registrationEnd = new Date(extracted.registrationEnd);
      filled.push('fim das inscrições');
    }
    if (extracted.governmentScope) {
      data.governmentScope = extracted.governmentScope;
    }
    if (Object.keys(data).length > 0) {
      await this.prisma.concurso.update({ where: { id: c.id }, data });
    }

    return { concursoId: c.id, extracted: true, filled, cost };
  }

  /**
   * FASE 6 — publica ou volta para rascunho. É o único ponto que torna o
   * concurso visível ao usuário final; tudo antes disso é bancada de trabalho.
   */
  async setPublished(
    concursoId: string,
    published: boolean,
  ): Promise<{ id: string; publishedAt: string | null }> {
    const exists = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('concurso not found');

    const updated = await this.prisma.concurso.update({
      where: { id: concursoId },
      data: { publishedAt: published ? new Date() : null },
      select: { id: true, publishedAt: true },
    });
    return {
      id: updated.id,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    };
  }

  /**
   * Define (ou limpa, com null) o link de documentos NA MÃO — a saída quando a
   * busca automática erra ou a origem bloqueia tudo. É caminho definitivo, não
   * afordância de erro: em site com WAF agressivo o admin abre no próprio
   * navegador, copia a URL certa e cola aqui.
   */
  async setDocumentsSourceUrl(
    concursoId: string,
    url: string | null,
  ): Promise<{ id: string; documentsSourceUrl: string | null }> {
    const trimmed = url?.trim() ?? '';
    let clean: string | null = null;
    if (trimmed) {
      try {
        const u = new URL(trimmed);
        if (!/^https?:$/.test(u.protocol)) throw new Error('protocolo');
        clean = u.toString();
      } catch {
        throw new BadRequestException(
          'URL inválida — precisa começar com http:// ou https://.',
        );
      }
    }
    return this.prisma.concurso
      .update({
        where: { id: concursoId },
        data: { documentsSourceUrl: clean },
        select: { id: true, documentsSourceUrl: true },
      })
      .catch(() => {
        throw new NotFoundException('concurso not found');
      });
  }

  /** Cargos de enfermagem do concurso — desempatam qual certame procurar. */
  private async nursingRoles(concursoId: string): Promise<string[]> {
    const cargos = await this.prisma.cargo.findMany({
      where: { concursoId, isNursingRelevant: true },
      select: { role: true },
      take: 5,
    });
    return [...new Set(cargos.map((c) => c.role).filter(Boolean))];
  }

  /**
   * Medidor de custo da operação. A taxa da busca web vem do env (string), por
   * isso a coerção explícita: `config.get<number>` NÃO converte o tipo.
   */
  private newMeter(): AiUsageMeter {
    const raw = this.config.get<string>('OPENAI_WEB_SEARCH_CALL_USD');
    const parsed = raw != null ? Number(raw) : NaN;
    return new AiUsageMeter(
      Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined,
    );
  }

  /**
   * Busca o link de UM concurso (aba Admin da página do concurso). Mesma busca
   * web + verificação do fluxo em massa, mas com resposta detalhada para o admin
   * decidir: diz se o link foi CONFIRMADO (a página lista documentos) ou apenas
   * ACEITO SEM VERIFICAÇÃO (a origem bloqueou a raspagem).
   *
   * Preserva o link salvo quando não acha — mesma regra do em massa.
   *
   * Devolve também o CUSTO de IA da operação (`cost`), somado das chamadas que
   * ela disparou: o admin vê o preço do clique na hora, em vez de descobrir no
   * painel da OpenAI no dia seguinte e agregado.
   */
  async findLinkForConcurso(concursoId: string): Promise<{
    found: boolean;
    url: string | null;
    verified: boolean;
    docCount: number;
    previousUrl: string | null;
    /** Candidato não confirmado — o admin abre e decide (não foi salvo). */
    suggestion: LinkSuggestion | null;
    cost: CostReport;
  }> {
    const c = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: {
        id: true,
        institution: true,
        state: true,
        city: true,
        year: true,
        documentsSourceUrl: true,
      },
    });
    if (!c) throw new NotFoundException('concurso not found');

    const meter = this.newMeter();
    const { confirmed, suggestion } = await this.findVerifiedConcursoLink(
      {
        institution: c.institution,
        uf: c.state,
        city: c.city,
        year: c.year,
        targetRoles: await this.nursingRoles(c.id),
      },
      null,
      meter,
    );

    // Só link CONFIRMADO é gravado. Sugestão vai para a tela e espera o aval.
    await this.prisma.concurso.update({
      where: { id: c.id },
      data: {
        ...(confirmed ? { documentsSourceUrl: confirmed.url } : {}),
        documentsCheckedAt: new Date(),
      },
    });

    const cost = meter.report();
    await this.costs.record(c.id, ConcursoAiPhase.LINK_SEARCH, cost);
    this.logger.log(
      `busca de link (${c.institution}): US$ ${cost.usd.toFixed(4)} em ${cost.entries.length} chamada(s)`,
    );
    return {
      found: !!confirmed,
      url: confirmed?.url ?? c.documentsSourceUrl,
      verified: !!confirmed,
      docCount: confirmed?.docCount ?? 0,
      previousUrl: c.documentsSourceUrl,
      suggestion,
      cost,
    };
  }

  /**
   * Busca EM MASSA o link do concurso ("Buscar links faltantes"): BUSCA WEB +
   * VERIFICAÇÃO por concurso (usando órgão/UF/cidade/ano salvos) e regrava
   * `documentsSourceUrl` quando acha; não achando, PRESERVA o que já estava lá
   * (pode ter sido colado à mão).
   *
   * ⚠️ CUSTO: cada concurso pode custar uma busca web + raspagens + chamadas de
   * IA. Por isso o alvo é SEMPRE só quem está sem link e ativo — o modo antigo
   * "revalidar todos os do pciconcursos" foi removido: rodava em ~100 concursos
   * de um clique, quase todos já resolvidos, e foi o que queimou o crédito.
   */
  async reextractLinks(): Promise<{
    processed: number;
    updated: number;
    stillMissing: number;
    cost: CostReport;
  }> {
    const concursos = await this.prisma.concurso.findMany({
      // Sem link e ainda ativo. Não exige `pciListingUrl`: concurso criado por
      // outro fluxo também pode estar sem link.
      where: { documentsSourceUrl: null, closedAt: null },
      select: {
        id: true,
        institution: true,
        state: true,
        city: true,
        year: true,
        documentsSourceUrl: true,
      },
    });

    // Um medidor POR CONCURSO (e não um só para a rodada): o total da rodada é
    // a soma deles, mas cada concurso precisa carregar o próprio custo no
    // histórico — senão o gasto do em massa some da conta individual.
    const entries: CostEntry[] = [];
    let updated = 0;
    let stillMissing = 0;
    for (const c of concursos) {
      const meter = this.newMeter();
      let outcome: LinkSearchOutcome;
      try {
        outcome = await this.findVerifiedConcursoLink(
          {
            institution: c.institution,
            uf: c.state,
            city: c.city,
            year: c.year,
            targetRoles: await this.nursingRoles(c.id),
          },
          null,
          meter,
        );
      } catch (err) {
        // O que já foi gasto até o erro foi gasto — registra antes de decidir.
        const partial = meter.report();
        entries.push(...partial.entries);
        await this.costs.record(c.id, ConcursoAiPhase.LINK_SEARCH, partial);
        // IA indisponível (sem crédito/chave inválida) não é "não achei": seria
        // o mesmo erro nos N concursos seguintes. Aborta e avisa o admin.
        if (err instanceof OpenAiUnavailableError) throw err;
        this.logger.warn(
          `reextract falhou (${c.institution}): ${(err as Error).message?.slice(0, 160)}`,
        );
        continue;
      }

      const roundCost = meter.report();
      entries.push(...roundCost.entries);
      await this.costs.record(c.id, ConcursoAiPhase.LINK_SEARCH, roundCost);

      const found = outcome.confirmed;
      // NÃO limpa quando não achou: o link salvo pode ter sido colado à mão pelo
      // admin (ou confirmado numa rodada anterior) e a busca é best-effort —
      // apagá-lo destruía trabalho manual a cada rodada.
      await this.prisma.concurso.update({
        where: { id: c.id },
        data: {
          ...(found ? { documentsSourceUrl: found.url } : {}),
          documentsCheckedAt: new Date(),
        },
      });
      if (found) updated++;
      else if (!c.documentsSourceUrl) stillMissing++;
    }
    const cost: CostReport = {
      usd: entries.reduce((sum, e) => sum + e.usd, 0),
      entries,
    };
    this.logger.log(
      `busca de links em massa: ${concursos.length} concurso(s), US$ ${cost.usd.toFixed(4)}`,
    );
    return { processed: concursos.length, updated, stillMissing, cost };
  }

  /** Listagem da página admin: todos os concursos + status temporal derivado. */
  async listConcursosAdmin(): Promise<AdminConcursoRow[]> {
    const concursos = await this.prisma.concurso.findMany({
      select: {
        id: true,
        slug: true,
        institution: true,
        state: true,
        year: true,
        registrationStart: true,
        registrationEnd: true,
        examDate: true,
        resultDate: true,
        documentsSourceUrl: true,
        documentsCheckedAt: true,
        editalUrl: true,
        pciListingUrl: true,
        closedAt: true,
        publishedAt: true,
        createdAt: true,
        _count: {
          select: { examBases: true, documents: true, aiCosts: true },
        },
      },
    });

    // Custo acumulado por concurso, numa query só (a listagem tem ~170 linhas;
    // um findMany por linha seria N+1 gratuito).
    const costRows = await this.prisma.concursoAiCost.groupBy({
      by: ['concursoId'],
      _sum: { usd: true },
    });
    const costByConcurso = new Map(
      costRows.map((r) => [r.concursoId, Number(r._sum.usd ?? 0)]),
    );

    const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
    const rank: Record<ConcursoStatus, number> = {
      open: 0,
      future: 1,
      past: 2,
    };

    return (
      concursos
        .map<AdminConcursoRow>((c) => ({
          id: c.id,
          slug: c.slug,
          institution: c.institution,
          state: c.state,
          year: c.year,
          status: deriveConcursoStatus({
            registrationStart: c.registrationStart,
            registrationEnd: c.registrationEnd,
            examDate: c.examDate,
          }),
          provaCount: c._count.examBases,
          // "Sem link do concurso" = falta a página específica na organizadora
          // (documentsSourceUrl); o edital em PDF sozinho não conta.
          needsSourceUrl: !c.documentsSourceUrl,
          closed: c.closedAt != null,
          documentsCheckedAt: c.documentsCheckedAt?.toISOString() ?? null,
          registrationEnd: iso(c.registrationEnd),
          createdAt: c.createdAt.toISOString(),
          published: c.publishedAt != null,
          // Sinais que o front usa para derivar em que fase o concurso está.
          hasNewsUrl: c.pciListingUrl != null,
          hasEditalUrl: c.editalUrl != null,
          documentCount: c._count.documents,
          // undefined ≠ 0: "nunca mediu" é diferente de "custou zero", e a
          // listagem precisa distinguir os concursos anteriores à medição.
          aiCostUsd:
            c._count.aiCosts > 0 ? (costByConcurso.get(c.id) ?? 0) : null,
        }))
        // Encerrados vão para o fim; entre os ativos, ordena por status temporal
        // e, dentro do status, do mais desatualizado para o mais recém-visto —
        // a lista é a fila de manutenção manual, então o que está parado há mais
        // tempo (nunca verificado primeiro) sobe.
        .sort(
          (a, b) =>
            Number(a.closed) - Number(b.closed) ||
            rank[a.status] - rank[b.status] ||
            staleRank(a.documentsCheckedAt) - staleRank(b.documentsCheckedAt) ||
            a.institution.localeCompare(b.institution, 'pt-BR'),
        )
    );
  }

  /** Encerra (arquiva) ou reabre um concurso — botão Fechar/Reabrir na lista. */
  async setClosed(
    concursoId: string,
    closed: boolean,
  ): Promise<{ id: string; closed: boolean }> {
    const existing = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('concurso não encontrado');
    await this.prisma.concurso.update({
      where: { id: concursoId },
      data: { closedAt: closed ? new Date() : null },
    });
    return { id: concursoId, closed };
  }

  // ---- helpers ----

  private yearFromText(text: string): number | null {
    const m = /\b(20\d{2})\b/.exec(text);
    return m ? parseInt(m[1], 10) : null;
  }

  private scopeFromInstitution(institution: string): GovernmentScope {
    const n = normalizeInstitution(institution);
    if (
      /\b(governo|secretaria|secretario|estad)\w*\b/.test(n) &&
      n.includes('estad')
    ) {
      return GovernmentScope.STATE;
    }
    if (/\b(federal|uniao|ministerio)\b/.test(n))
      return GovernmentScope.FEDERAL;
    return GovernmentScope.MUNICIPAL;
  }

  private async extractFromNews(
    newsUrl: string,
    meter?: AiUsageMeter,
  ): Promise<ExtractedNews | null> {
    const html = await this.fetchHtml(newsUrl);
    const simplified = this.simplifyHtml(html, newsUrl);
    if (!simplified.trim()) return null;
    const raw = await this.callOpenAiJson(
      NEWS_SYSTEM_PROMPT,
      simplified,
      512,
      meter,
    );
    if (!raw) return null;
    return this.normalizeExtracted(raw);
  }

  /**
   * Busca web + 2º salto pelo site da banca, com VERIFICAÇÃO.
   *
   * ⚠️ NUNCA salva o que não conseguiu confirmar. Medimos que o modelo COMPÕE
   * URLs em vez de copiá-las (Mondaí devolveu 3 endereços diferentes e todos
   * 404, em `low`/`medium`/`high`), e que origens atrás de Cloudflare nunca
   * podem ser verificadas — as duas coisas juntas tornam a decisão automática
   * impossível. Então: confirmado vira link; não-confirmado vira SUGESTÃO, que
   * o admin abre e aprova em segundos. Antes isso oscilou entre salvar link
   * errado (Mondaí) e descartar link certo — os dois lados do mesmo palpite.
   */
  private async findVerifiedConcursoLink(
    identity: ConcursoIdentity,
    extracted: ExtractedNews | null = null,
    meter?: AiUsageMeter,
  ): Promise<LinkSearchOutcome> {
    /* ORDEM POR CUSTO. A busca web é de longe a chamada mais cara (taxa por
     * chamada + tokens dos resultados); o 2º salto é 1 raspagem + 1 chamada no
     * mini. Quando a notícia já nos deu a banca, o caminho barato costuma
     * bastar — então ele vem primeiro e a busca web só entra se ele falhar. */
    const knownBanca = this.dedupeByHost([extracted?.bancaUrl ?? null]);
    let earlyBlocked: string | null = null;
    let earlyDeadEnd: string | null = null;
    if (knownBanca.length > 0) {
      const early = await this.hopThroughBancas(
        knownBanca,
        identity,
        [],
        meter,
      );
      if (early.confirmed)
        return { confirmed: early.confirmed, suggestion: null };
      earlyBlocked = early.blockedUrl;
      earlyDeadEnd = early.deadEnd;
    }

    const search = await this.webSearchConcursoCandidates(
      identity,
      extracted,
      meter,
    ).catch((err) => {
      // Conta/chave da OpenAI não é falha "deste" concurso — deixa subir.
      if (err instanceof OpenAiUnavailableError) throw err;
      this.logger.warn(
        `busca web falhou (${identity.institution}): ${(err as Error).message?.slice(0, 160)}`,
      );
      return { candidates: [] as string[], organizerSeed: null };
    });
    const first = await this.verifyCandidates(
      search.candidates,
      identity,
      meter,
    );
    if (first.confirmed)
      return { confirmed: first.confirmed, suggestion: null };

    /* 2º salto pela banca que a BUSCA indicou — salva o caso comum de acertar a
     * organizadora e errar a URL (o modelo deduz o padrão do site e devolve um
     * endereço plausível que dá 404). A `organizerUrl` era descartada por ser
     * home "pelada", justamente o pedaço mais confiável da resposta. */
    const second = await this.hopThroughBancas(
      this.dedupeByHost([search.organizerSeed]).filter(
        (s) => !knownBanca.includes(s),
      ),
      identity,
      search.candidates,
      meter,
    );
    if (second.confirmed)
      return { confirmed: second.confirmed, suggestion: null };

    /* Nada confirmado: o melhor candidato vira SUGESTÃO (não é salvo). A ordem
     * reflete a confiança: link copiado do site da banca (2º salto) antes de
     * link composto pela busca web. */
    const fromBanca = earlyBlocked ?? second.blockedUrl;
    /* Ordem de confiança. O `deadEnd` é a PLATAFORMA que identificamos mas não
     * conseguimos ler (Cloudflare barra até o Chromium em selecao.net.br e
     * afins): não é a resposta, mas dizer "a organizadora usa esta plataforma"
     * é acionável — o admin abre lá e copia o link do concurso. Melhor que
     * devolver "não achei nada", que joga fora o que já descobrimos. */
    const deadEnd = earlyDeadEnd ?? second.deadEnd;
    const suggestion: LinkSuggestion | null = fromBanca
      ? { url: fromBanca, origin: 'site da banca' }
      : first.blockedUrl
        ? { url: first.blockedUrl, origin: 'busca web' }
        : deadEnd
          ? { url: deadEnd, origin: 'plataforma da organizadora' }
          : null;
    if (suggestion) {
      this.logger.log(
        `sugestão não verificada (${identity.institution}): ${suggestion.url} [${suggestion.origin}]`,
      );
    }
    return { confirmed: null, suggestion };
  }

  /**
   * 2º salto para um conjunto de sementes (sites de banca) + verificação do que
   * sair. `skip` evita re-verificar URL que já passou pelo crivo nesta rodada.
   */
  private async hopThroughBancas(
    seeds: string[],
    identity: ConcursoIdentity,
    skip: string[],
    meter?: AiUsageMeter,
  ): Promise<{
    confirmed: { url: string; docCount: number; verified: boolean } | null;
    blockedUrl: string | null;
    deadEnd: string | null;
  }> {
    const found: string[] = [];
    let deadEnd: string | null = null;
    for (const seed of seeds) {
      const hop = await this.findConcursoLinkOnBanca(seed, identity, 0, meter);
      const url = hop.concursoUrl;
      if (url && !skip.includes(url) && !found.includes(url)) found.push(url);
      deadEnd ??= hop.deadEnd;
    }
    return {
      ...(await this.verifyCandidates(found, identity, meter)),
      deadEnd,
    };
  }

  /**
   * Raspa cada candidata e devolve a 1ª CONFIRMADA (a página lista documentos),
   * mais a 1ª que ficou sem verificação por bloqueio da origem.
   */
  private async verifyCandidates(
    candidates: string[],
    identity: ConcursoIdentity,
    meter?: AiUsageMeter,
  ): Promise<{
    confirmed: { url: string; docCount: number; verified: boolean } | null;
    blockedUrl: string | null;
  }> {
    let blockedUrl: string | null = null;
    for (const url of candidates) {
      const { docCount, blocked } = await this.countConcursoDocsAt(url, meter);
      if (docCount > 0) {
        this.logger.log(
          `link confirmado (${identity.institution}): ${url} — ${docCount} doc(s)`,
        );
        return {
          confirmed: { url, docCount, verified: true },
          blockedUrl,
        };
      }
      if (blocked) {
        blockedUrl ??= url;
        this.logger.log(
          `link não verificável — origem bloqueou a raspagem (${identity.institution}): ${url}`,
        );
        continue;
      }
      this.logger.log(
        `link rejeitado — página lida, sem documentos (${identity.institution}): ${url}`,
      );
    }
    return { confirmed: null, blockedUrl };
  }

  /**
   * Busca web → `candidates` (URLs prontas para verificar) + `organizerSeed`
   * (o site da BANCA, ponto de partida do 2º salto).
   *
   * A semente é guardada mesmo sendo home "pelada": como resposta final ela é
   * inútil (home não tem editais), mas como PISTA é o pedaço mais confiável do
   * que a busca devolve — a banca o modelo acerta, a URL exata ele costuma
   * deduzir errado.
   */
  private async webSearchConcursoCandidates(
    identity: ConcursoIdentity,
    extracted: ExtractedNews | null = null,
    meter?: AiUsageMeter,
  ): Promise<{ candidates: string[]; organizerSeed: string | null }> {
    const local =
      [identity.city, identity.uf].filter(Boolean).join(' / ') ||
      'não informado';
    // Saber a BANCA é o dado que mais encurta a busca (a página de documentos
    // vive no site dela). A notícia já nos deu o site da banca e, às vezes, o
    // link do edital — de onde sai o domínio da organizadora.
    const bancaHost =
      this.hostOf(extracted?.bancaUrl) ?? this.hostOf(extracted?.editalUrl);
    const input = [
      `Nome: ${identity.headline ?? identity.institution}`,
      `Órgão: ${identity.institution}`,
      `Ano: ${identity.year ?? 'não informado'}`,
      `Estado ou município: ${local}`,
      identity.targetRoles?.length
        ? `CARGO DE INTERESSE: ${identity.targetRoles.join(', ')}. ⚠️ O órgão pode ter MAIS DE UM certame no mesmo ano (concurso público E processo seletivo, com números de edital diferentes e páginas separadas). Escolha o certame que oferece ESTE cargo.`
        : '',
      bancaHost
        ? `Banca organizadora (site onde as inscrições são feitas): ${bancaHost} — a página de documentos quase certamente está NESTE domínio, procure ali primeiro.`
        : 'Banca organizadora: não informada — descubra qual é.',
      extracted?.editalUrl
        ? `Link do edital citado na notícia (a página de documentos costuma ser a página que HOSPEDA este arquivo): ${extracted.editalUrl}`
        : '',
      `Informações adicionais: ${identity.headline ?? '-'}`,
    ]
      .filter(Boolean)
      .join('\n');

    const empty = { candidates: [] as string[], organizerSeed: null };
    const { text, citations } = await this.callOpenAiWebSearch(
      WEBSEARCH_SYSTEM_PROMPT,
      input,
      meter,
    );
    if (!text) return empty;
    const raw = parseJsonLoose(text);
    if (!raw) return empty;

    /* As `citations` (url_citation) são URLs que a BUSCA de fato devolveu — não
     * compostas pelo modelo. Entram como candidatas EXTRAS.
     *
     * ⚠️ Medimos que elas NÃO servem de filtro: com o prompt pedindo JSON, a
     * resposta costuma vir com zero annotations (e mesmo em prosa vieram 0–1,
     * apontando para a notícia e não para o alvo). Exigir "URL citada" rejeitaria
     * quase tudo. Então a URL do modelo continua candidata — quem separa o joio
     * é a VERIFICAÇÃO, e o que não dá para verificar vira sugestão na tela. */
    const candidates: string[] = [];
    const primary = this.cleanOfficialUrl(raw.officialContestUrl);
    if (primary) candidates.push(primary);
    for (const c of citations) {
      const clean = this.cleanOfficialUrl(c);
      if (clean && !candidates.includes(clean)) candidates.push(clean);
    }

    // Semente do 2º salto: a organizadora dita pela busca (home serve), ou o
    // domínio da candidata principal quando a busca não nomeou a banca.
    const organizerSeed =
      cleanSeedUrl(raw.organizerUrl) ?? cleanSeedUrl(raw.officialContestUrl);
    return { candidates, organizerSeed };
  }

  /** Sementes distintas por host (não adianta raspar 2x o mesmo site). */
  private dedupeByHost(urls: (string | null)[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of urls) {
      const host = this.hostOf(url);
      if (url == null || host == null || seen.has(host)) continue;
      seen.add(host);
      out.push(url);
    }
    return out;
  }

  /**
   * Confirma que a URL é uma PÁGINA DE DOCUMENTOS do concurso: raspa a página e
   * conta os documentos (a IA do scraper já descarta navegação/menu). Home de
   * prefeitura/banca → ~0.
   *
   * ⚠️ Distingue REJEITAR de NÃO CONSEGUIR VERIFICAR: quando a raspagem lança
   * (Cloudflare/WAF — comum nas bancas), o link pode estar perfeito e nós é que
   * não conseguimos lê-lo. Devolver 0 aí descartava links certos; agora vira
   * `blocked` e o chamador aceita como não-verificado.
   */
  private async countConcursoDocsAt(
    url: string,
    meter?: AiUsageMeter,
  ): Promise<{ docCount: number; blocked: boolean }> {
    try {
      // Perfil ENXUTO: aqui só perguntamos "esta página lista documentos?" — a
      // lista fiel e completa é trabalho da aba Notícias, com o perfil cheio.
      const res = await this.docScraper.scrapeDocuments(
        url,
        VERIFY_SCRAPE,
        meter,
      );
      return {
        docCount: res.documents.filter((d) => d.url).length,
        blocked: false,
      };
    } catch (err) {
      // 404 (ou qualquer status que não seja bloqueio) = a URL não existe →
      // REJEITA. Só 403/429 conta como "não consegui ler".
      const blocked =
        err instanceof PageFetchError ? err.blocked : !(err instanceof Error);
      this.logger.warn(
        `verificação do link ${blocked ? 'bloqueada' : 'falhou'} (${url}): ${(err as Error).message?.slice(0, 120)}`,
      );
      return { docCount: 0, blocked };
    }
  }

  /**
   * 2º salto: raspa o site da banca e procura o link do concurso entre os links
   * que EXISTEM na página (ao contrário da busca web, que deduz URLs).
   *
   * A home raramente lista os concursos (o IBGP, por exemplo, os guarda em
   * `proximos.jsp`), então quando a IA não acha o concurso direto ela aponta a
   * PÁGINA DE LISTAGEM e seguimos até lá — um pulo extra, no máximo.
   */
  private async findConcursoLinkOnBanca(
    bancaUrl: string | null,
    identity: ConcursoIdentity,
    depth = 0,
    meter?: AiUsageMeter,
    rendered = false,
  ): Promise<HopResult> {
    if (!bancaUrl) return NO_HOP;
    const html = await this.docScraper.fetchPageHtml(bancaUrl, {
      render: rendered,
    });
    if (!html) return NO_HOP;
    const simplified = this.simplifyHtml(html, bancaUrl, 120);
    if (!simplified.trim()) return NO_HOP;

    const local = [identity.city, identity.uf].filter(Boolean).join('/');
    const user =
      `Concurso a localizar — Órgão: ${identity.institution}` +
      `${local ? ` (${local})` : ''}. Ano: ${identity.year ?? '?'}.\n\n` +
      simplified;
    const raw = await this.callOpenAiJson(
      BANCA_SYSTEM_PROMPT,
      user,
      256,
      meter,
    );

    const direct = raw
      ? this.resolveExternalUrl(raw.concursoUrl, bancaUrl)
      : null;
    if (direct) return { concursoUrl: direct, deadEnd: null };

    /* Nada aqui e ainda não renderizamos? A lista de concursos de muitas bancas
     * vem por JS: o HTML estático chega inteiro (200, ~100kB) mas SEM nenhum
     * link de concurso — foi o que travou o caso Mondaí, onde o link real mora
     * num subdomínio de plataforma que só aparece depois do JS rodar. */
    const listingRaw = raw
      ? this.resolveExternalUrl(raw.listingUrl, bancaUrl)
      : null;
    if (!rendered && !listingRaw) {
      this.logger.log(
        `2º salto — HTML estático sem links, renderizando (${identity.institution}): ${bancaUrl}`,
      );
      return this.findConcursoLinkOnBanca(
        bancaUrl,
        identity,
        depth,
        meter,
        true,
      );
    }
    if (!raw) return NO_HOP;

    // Só um nível de listagem: o suficiente para "home → Concursos → concurso",
    // sem virar um crawler que passeia pelo site inteiro.
    if (depth > 0) return { concursoUrl: null, deadEnd: bancaUrl };
    const listing = listingRaw;
    if (!listing || listing === bancaUrl) return NO_HOP;
    this.logger.log(
      `2º salto — seguindo a listagem da banca (${identity.institution}): ${listing}`,
    );
    const next = await this.findConcursoLinkOnBanca(
      listing,
      identity,
      depth + 1,
      meter,
    );
    /* Não conseguimos abrir a listagem (Cloudflare barra até o Chromium em
     * plataformas como selecao.net.br)? Guardamos O ENDEREÇO DELA. Saber "a
     * organizadora usa a plataforma X" é acionável — o admin abre lá e copia o
     * link — e muito melhor que devolver "não achei nada". */
    return next.concursoUrl
      ? next
      : { concursoUrl: null, deadEnd: next.deadEnd ?? listing };
  }

  private cleanOfficialUrl(v: unknown): string | null {
    return cleanConcursoUrl(v);
  }

  /** Hostname de uma URL (sem "www."), ou null. Usado p/ citar a banca na busca. */
  private hostOf(v: string | null | undefined): string | null {
    if (!v) return null;
    try {
      const host = new URL(v).hostname.replace(/^www\./i, '');
      return isAggregatorHost(host) ? null : host;
    } catch {
      return null;
    }
  }

  /**
   * Reduz uma página ao texto + links (resolvidos p/ absolutos, fora do
   * pciconcursos). `linkCap` limita a lista — a notícia precisa de poucos links;
   * o site da banca precisa de mais para o link do concurso não ser cortado.
   */
  private simplifyHtml(html: string, pageUrl: string, linkCap = 40): string {
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, iframe, head, img, form').remove();

    const links: string[] = [];
    $('a[href]').each((_i, el) => {
      const href = $(el).attr('href')?.trim();
      if (!href) return;
      let abs: string;
      try {
        abs = new URL(href, pageUrl).toString();
      } catch {
        return;
      }
      // O link do concurso é sempre externo ao pciconcursos.
      if (/pciconcursos\.com\.br/i.test(abs)) return;
      if (!/^https?:/i.test(abs)) return;
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      links.push(`${text || '(link)'} => ${abs}`);
    });

    const body = ($('#noticia').text() || $('body').text() || $.root().text())
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12_000);

    const linkBlock = [...new Set(links)].slice(0, linkCap).join('\n');
    return `TEXTO DA PÁGINA:\n${body}\n\nLINKS:\n${linkBlock}`.slice(0, 18_000);
  }

  /** Resolve a URL (relativa → absoluta contra a banca), exige http e não-pci. */
  private resolveExternalUrl(v: unknown, base: string): string | null {
    if (typeof v !== 'string' || !v.trim()) return null;
    let abs: string;
    try {
      abs = new URL(v.trim(), base).toString();
    } catch {
      return null;
    }
    if (!/^https?:/i.test(abs) || /pciconcursos\.com\.br/i.test(abs))
      return null;
    return abs;
  }

  private normalizeExtracted(raw: Record<string, unknown>): ExtractedNews {
    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.trim() ? v.trim() : null;
    const url = (v: unknown): string | null => {
      const s = str(v);
      if (!s || !/^https?:/i.test(s) || /pciconcursos\.com\.br/i.test(s))
        return null;
      return s;
    };
    const date = (v: unknown): string | null => {
      const s = str(v);
      return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
    };
    const scope =
      raw.governmentScope === 'MUNICIPAL' ||
      raw.governmentScope === 'STATE' ||
      raw.governmentScope === 'FEDERAL'
        ? (raw.governmentScope as GovernmentScope)
        : null;
    const year =
      typeof raw.year === 'number' && raw.year > 2000 && raw.year < 2100
        ? raw.year
        : null;
    return {
      bancaUrl: url(raw.bancaUrl),
      editalUrl: url(raw.editalUrl),
      year,
      governmentScope: scope,
      city: str(raw.city),
      registrationStart: date(raw.registrationStart),
      registrationEnd: date(raw.registrationEnd),
    };
  }

  private async callOpenAiJson(
    system: string,
    user: string,
    maxTokens: number,
    meter?: AiUsageMeter,
  ): Promise<Record<string, unknown> | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) return null;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      this.logger.warn(`OpenAI ${res.status}: ${body}`);
      if (res.status === 401 || res.status === 429)
        throw new OpenAiUnavailableError(res.status, body);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    meter?.record('leitura de página (IA)', 'gpt-4.1-mini', data);
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      try {
        return JSON.parse(jsonrepair(content)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }

  /**
   * Chama a OpenAI Responses API com a tool `web_search_preview` (o modelo
   * PESQUISA na internet, como o ChatGPT com navegação) e devolve o texto final.
   * null quando sem chave, erro HTTP, ou sem texto de saída (best-effort).
   */
  private async callOpenAiWebSearch(
    instructions: string,
    input: string,
    meter?: AiUsageMeter,
  ): Promise<{ text: string | null; citations: string[] }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) return { text: null, citations: [] };
    /* ⚠️ MODELO IMPORTA MAIS QUE O PROMPT AQUI. Medido no caso Mondaí:
     *   gpt-4.1-mini → 1 busca,  2,8s,  1k tokens  → URL errada (home da banca)
     *   gpt-5.6-sol  → 4 buscas, 17s,  30k tokens  → URL correta
     * O mini faz UMA busca e compõe a URL de memória (3 endereços diferentes,
     * todos 404, em low/medium/high). O sol encadeia buscas e chega na página
     * real — inclusive quando ela está numa plataforma terceira. Nenhum ajuste
     * de prompt ou de search_context_size comprou isso.
     * Custa ~30× mais tokens por busca; é aceitável porque a busca de link roda
     * uma vez por concurso e o alvo é só quem está sem link. */
    const model =
      this.config.get<string>('OPENAI_WEBSEARCH_MODEL') ?? 'gpt-5.6-sol';

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      // Busca web + navegação leva mais tempo que uma chat completion normal.
      signal: AbortSignal.timeout(120_000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        tools: [
          {
            type: 'web_search_preview',
            // Sem localização o buscador assume contexto US e devolve resultado
            // ruim p/ "Prefeitura de X / SP". Isso é barato e ajuda — fica.
            user_location: { type: 'approximate', country: 'BR' },
            // ⚠️ CUSTO: 'high' injeta muito texto de resultado no prompt e foi o
            // principal responsável por queimar crédito numa rodada em massa.
            // Só precisamos de UMA URL, não de um panorama da web — e no teste
            // com contexto alto o modelo devolveu URL inventada do mesmo jeito.
            search_context_size: 'low',
          },
        ],
        // 'auto' de volta: forçar a tool fazia o modelo pular o raciocínio e
        // mandar o formulário INTEIRO como query de busca (verificado no caso
        // Faria Lemos). Com auto ele formula a query — e pode responder sem
        // buscar quando já sabe, o que também economiza.
        tool_choice: 'auto',
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 240);
      this.logger.warn(`OpenAI web_search ${res.status}: ${body}`);
      // 401/429 = conta/chave, não conteúdo: não vale seguir para o próximo.
      if (res.status === 401 || res.status === 429)
        throw new OpenAiUnavailableError(res.status, body);
      return { text: null, citations: [] };
    }
    const data = (await res.json()) as unknown;
    // A taxa por chamada da tool NÃO vem no `usage` — some à parte.
    meter?.record('busca web (tokens)', model, data);
    meter?.recordWebSearchCall();
    return {
      text: extractResponsesText(data),
      citations: extractCitations(data),
    };
  }

  /** Baixa o HTML com headers de navegador + retry (pciconcursos não é Cloudflare). */
  private async fetchHtml(url: string, attempts = 3): Promise<string> {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`);
        return await res.text();
      } catch (err) {
        if (i === attempts - 1) {
          throw new BadRequestException(
            `Não foi possível buscar a página do pciconcursos: ${(err as Error).message?.slice(0, 160)}`,
          );
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw new BadRequestException(`Falha ao buscar ${url}`);
  }
}
