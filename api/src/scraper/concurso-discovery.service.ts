import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GovernmentScope } from '@prisma/client';
import * as cheerio from 'cheerio';
import { jsonrepair } from 'jsonrepair';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoLinkService } from '../concurso/concurso-link.service';
import { deriveConcursoStatus } from '../concurso/concurso-status';
import type { ConcursoStatus } from '../concurso/concurso-status';
import { DocumentScraperService } from './document-scraper.service';

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
  registrationEnd: string | null;
  createdAt: string;
}

/** Identidade do concurso usada para localizar sua página oficial. */
interface ConcursoIdentity {
  institution: string;
  uf: string | null;
  city: string | null;
  year: number | null;
  /** Manchete/nome do concurso (dá contexto extra à busca), opcional. */
  headline?: string | null;
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

Retorne SOMENTE um JSON válido, sem markdown: {"concursoUrl":"..."} (ou {"concursoUrl":null}).

- concursoUrl: a URL da página DESTE concurso específico (a que tem o edital, cronograma e inscrição do órgão informado). O link costuma conter o nome do órgão/cidade, o ano, ou palavras como "concurso", "edital", "processo-seletivo", "inscricao". Escolha o link que MELHOR corresponde ao órgão/cidade/ano informados pelo usuário.
- Se a página não tiver um link claramente específico para ESTE concurso (só listas genéricas ou nada que bata), retorne null. NÃO invente URL; use apenas links presentes na página.
`.trim();

/** Busca web (Responses API + tool web_search) da PÁGINA DE DOCUMENTOS do concurso. */
const WEBSEARCH_SYSTEM_PROMPT = `
Você localiza a PÁGINA DE DOCUMENTOS de um concurso público brasileiro específico.

O alvo é UMA URL: a página onde estão PUBLICADOS OS DOCUMENTOS deste concurso — edital de abertura, retificações, anexos, convocações, gabaritos e resultados. É a página de onde um candidato BAIXA os editais.

O ERRO MAIS COMUM é devolver uma HOME (da prefeitura ou da banca) — EVITE isso a todo custo:
- Essa página quase SEMPRE fica no site da BANCA ORGANIZADORA (ex.: institutoaocp.org.br, ibfc.org.br, vunesp.com.br, cebraspe.org.br, fgv.br, quadrix.org.br, fundatec.org.br, idecan.org.br, consulplan.net, objetivas.com.br, ibam...), e é uma página ESPECÍFICA daquele concurso (o caminho da URL costuma ter o nome/cidade do órgão, o ano, ou o número do edital).
- NÃO retorne a HOME da prefeitura/órgão (ex.: "https://www.cidade.sp.gov.br/") — lá NÃO ficam os editais.
- NÃO retorne a HOME da banca (ex.: "https://www.vunesp.com.br/") — tem que ser a página DAQUELE concurso.
- NÃO retorne página de notícia, de login, de inscrição genérica, agregador (PCI Concursos, Gran, Estratégia, QConcursos etc.) nem o PDF solto do edital.
- Uma URL de domínio "pelado" (só o domínio, sem um caminho específico do concurso) é QUASE SEMPRE ERRADA.
- Só use uma página do site do ÓRGÃO/prefeitura se o próprio órgão for a organizadora E existir ali uma página específica desse concurso com a LISTA de documentos.

Como agir:
- PESQUISE na internet. Descubra a banca organizadora e ache a página do concurso no site dela.
- Confirme que a página menciona o órgão, o concurso e o ano, e que ela LISTA documentos/editais.
- Remova parâmetros de rastreamento (utm_*, fbclid...).
- Se você só encontrar HOMEs, ou não achar a página específica que LISTA os documentos, é MELHOR retornar "NOT_FOUND" do que devolver uma home errada. NÃO invente URL.

Responda SOMENTE com um JSON válido, sem markdown:
{"officialContestUrl":"https://...","organizerUrl":"https://..."}
- officialContestUrl: a PÁGINA DE DOCUMENTOS específica do concurso na organizadora (resposta principal). "NOT_FOUND" se não achar.
- organizerUrl: a HOME do site da banca organizadora, se você a identificou (só referência/fallback). "NOT_FOUND" se não souber.
`.trim();

/** Domínios de agregadores/cursinhos que NUNCA valem como link oficial. */
const AGGREGATOR_HOST =
  /(pciconcursos|acheconcursos|concursosnobrasil|grancursos|granconcursos|estrategiaconcursos|estrategia|folhadirigida|jcconcursos|qconcursos|tecconcursos|direcaoconcursos|beabadoconcurso|pcimarcas|concursos\.com)/i;

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
  if (AGGREGATOR_HOST.test(u.hostname)) return null;
  // Home sem caminho específico do concurso → quase sempre errada.
  if (u.pathname.replace(/\/+$/, '') === '' && !u.search) return null;
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_)/i.test(key))
      u.searchParams.delete(key);
  }
  return u.toString();
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
 * adicionar em 1 clique só os que ainda não existem — já salvando o link
 * oficial da organizadora (extraído da notícia por IA). Concurso sem link
 * oficial é criado mesmo assim e destacado para captura manual.
 */
@Injectable()
export class ConcursoDiscoveryService {
  private readonly logger = new Logger(ConcursoDiscoveryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly concursoLink: ConcursoLinkService,
    private readonly docScraper: DocumentScraperService,
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

    // Visita a notícia e extrai o site da banca + metadados (best-effort).
    const extracted = await this.extractFromNews(candidate.newsUrl).catch(
      (err) => {
        this.logger.warn(
          `extração da notícia falhou (${candidate.newsUrl}): ${(err as Error).message?.slice(0, 160)}`,
        );
        return null;
      },
    );

    const year =
      extracted?.year ??
      this.yearFromText(candidate.headline) ??
      new Date().getUTCFullYear();
    const scope =
      extracted?.governmentScope ?? this.scopeFromInstitution(institution);
    // Acha a página oficial do concurso (busca web + fallback no site da banca).
    const concursoUrl = await this.resolveConcursoLink(extracted, {
      institution,
      uf,
      city: extracted?.city ?? null,
      year,
      headline: candidate.headline,
    });

    const concurso = await this.concursoLink.findOrCreateConcurso({
      institution,
      year,
      governmentScope: scope,
      state: uf,
      city: extracted?.city ?? null,
      examBoardId: null,
      boardLabel: null,
    });

    const updated = await this.prisma.concurso.update({
      where: { id: concurso.id },
      data: {
        pciListingUrl: candidate.newsUrl,
        documentsSourceUrl: concursoUrl,
        editalUrl: extracted?.editalUrl ?? null,
        registrationStart: extracted?.registrationStart
          ? new Date(extracted.registrationStart)
          : null,
        registrationEnd: extracted?.registrationEnd
          ? new Date(extracted.registrationEnd)
          : null,
        ...(extracted?.city ? { city: extracted.city } : {}),
        documentsCheckedAt: new Date(),
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
      officialUrlFound: !!concursoUrl,
      created: true,
    };
  }

  /**
   * Recorrige EM MASSA o link do concurso de todos os concursos vindos do
   * pciconcursos (com `pciListingUrl`): faz BUSCA WEB + VERIFICAÇÃO por concurso
   * (usando órgão/UF/cidade/ano salvos) e só regrava `documentsSourceUrl` com um
   * link CONFIRMADO (que lista documentos); senão limpa p/ captura manual. É o
   * "corrigir tudo de uma vez". Sequencial e pesado (busca web + raspagem).
   */
  async reextractLinks(): Promise<{
    processed: number;
    updated: number;
    stillMissing: number;
  }> {
    const concursos = await this.prisma.concurso.findMany({
      where: { pciListingUrl: { not: null } },
      select: {
        id: true,
        institution: true,
        state: true,
        city: true,
        year: true,
      },
    });

    let updated = 0;
    let stillMissing = 0;
    for (const c of concursos) {
      const found = await this.findVerifiedConcursoLink({
        institution: c.institution,
        uf: c.state,
        city: c.city,
        year: c.year,
      }).catch((err) => {
        this.logger.warn(
          `reextract falhou (${c.institution}): ${(err as Error).message?.slice(0, 160)}`,
        );
        return null;
      });
      await this.prisma.concurso.update({
        where: { id: c.id },
        data: {
          documentsSourceUrl: found?.url ?? null,
          documentsCheckedAt: new Date(),
        },
      });
      if (found) updated++;
      else stillMissing++;
    }
    return { processed: concursos.length, updated, stillMissing };
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
        editalUrl: true,
        closedAt: true,
        createdAt: true,
        _count: { select: { examBases: true } },
      },
    });

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
          registrationEnd: iso(c.registrationEnd),
          createdAt: c.createdAt.toISOString(),
        }))
        // Encerrados vão para o fim; entre os ativos, ordena por status temporal.
        .sort(
          (a, b) =>
            Number(a.closed) - Number(b.closed) ||
            rank[a.status] - rank[b.status] ||
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
  ): Promise<ExtractedNews | null> {
    const html = await this.fetchHtml(newsUrl);
    const simplified = this.simplifyHtml(html, newsUrl);
    if (!simplified.trim()) return null;
    const raw = await this.callOpenAiJson(NEWS_SYSTEM_PROMPT, simplified, 512);
    if (!raw) return null;
    return this.normalizeExtracted(raw);
  }

  /**
   * Acha E CONFIRMA a página de documentos do concurso. Só devolve uma URL que
   * realmente lista documentos do concurso (senão null → captura manual — evita
   * salvar home de prefeitura/banca, que quebra a Fase 1 do "Atualizar").
   */
  private async resolveConcursoLink(
    extracted: ExtractedNews | null,
    identity: ConcursoIdentity,
  ): Promise<string | null> {
    const found = await this.findVerifiedConcursoLink(identity, extracted);
    return found?.url ?? null;
  }

  /**
   * Busca web (várias candidatas) + VERIFICAÇÃO: raspa cada candidata e só
   * aceita a que de fato lista documentos do concurso. Ordem: página específica
   * (officialContestUrl) → home da banca (organizerUrl) → link achado no site da
   * banca (1º salto). Devolve a 1ª confirmada, ou null.
   */
  private async findVerifiedConcursoLink(
    identity: ConcursoIdentity,
    extracted: ExtractedNews | null = null,
  ): Promise<{ url: string; docCount: number } | null> {
    const candidates = await this.webSearchConcursoCandidates(identity).catch(
      (err) => {
        this.logger.warn(
          `busca web falhou (${identity.institution}): ${(err as Error).message?.slice(0, 160)}`,
        );
        return [] as string[];
      },
    );
    // Fallback: a página do concurso achada raspando o site da banca (1º salto).
    const viaBanca = await this.findConcursoLinkOnBanca(
      extracted?.bancaUrl ?? null,
      identity,
    );
    if (viaBanca && !candidates.includes(viaBanca)) candidates.push(viaBanca);

    for (const url of candidates) {
      const docCount = await this.countConcursoDocsAt(url);
      if (docCount > 0) {
        this.logger.log(
          `link confirmado (${identity.institution}): ${url} — ${docCount} doc(s)`,
        );
        return { url, docCount };
      }
      this.logger.log(
        `link rejeitado — sem documentos (${identity.institution}): ${url}`,
      );
    }
    return null;
  }

  /** Busca web → candidatas (página do concurso + home da banca), limpas/dedup. */
  private async webSearchConcursoCandidates(
    identity: ConcursoIdentity,
  ): Promise<string[]> {
    const local =
      [identity.city, identity.uf].filter(Boolean).join(' / ') ||
      'não informado';
    const input = [
      `Nome: ${identity.headline ?? identity.institution}`,
      `Órgão: ${identity.institution}`,
      `Ano: ${identity.year ?? 'não informado'}`,
      `Estado ou município: ${local}`,
      `Informações adicionais: ${identity.headline ?? '-'}`,
    ].join('\n');

    const text = await this.callOpenAiWebSearch(WEBSEARCH_SYSTEM_PROMPT, input);
    if (!text) return [];
    const raw = parseJsonLoose(text);
    if (!raw) return [];
    const out: string[] = [];
    const primary = this.cleanOfficialUrl(raw.officialContestUrl);
    if (primary) out.push(primary);
    const fallback = this.cleanOfficialUrl(raw.organizerUrl);
    if (fallback && !out.includes(fallback)) out.push(fallback);
    return out;
  }

  /**
   * Confirma que a URL é uma PÁGINA DE DOCUMENTOS do concurso: raspa a página e
   * conta os documentos (a IA do scraper já descarta navegação/menu). Home de
   * prefeitura/banca → ~0. Best-effort (bloqueio/erro → 0 = rejeita).
   */
  private async countConcursoDocsAt(url: string): Promise<number> {
    try {
      const res = await this.docScraper.scrapeDocuments(url);
      return res.documents.filter((d) => d.url).length;
    } catch (err) {
      this.logger.warn(
        `verificação do link falhou (${url}): ${(err as Error).message?.slice(0, 120)}`,
      );
      return 0;
    }
  }

  /** Fallback do 1º salto: raspa o site da banca e procura o link ali dentro. */
  private async findConcursoLinkOnBanca(
    bancaUrl: string | null,
    identity: ConcursoIdentity,
  ): Promise<string | null> {
    if (!bancaUrl) return null;
    const html = await this.docScraper.fetchPageHtml(bancaUrl);
    if (!html) return null;
    const simplified = this.simplifyHtml(html, bancaUrl, 120);
    if (!simplified.trim()) return null;

    const local = [identity.city, identity.uf].filter(Boolean).join('/');
    const user =
      `Concurso a localizar — Órgão: ${identity.institution}` +
      `${local ? ` (${local})` : ''}. Ano: ${identity.year ?? '?'}.\n\n` +
      simplified;
    const raw = await this.callOpenAiJson(BANCA_SYSTEM_PROMPT, user, 256);
    if (!raw) return null;
    return this.resolveExternalUrl(raw.concursoUrl, bancaUrl);
  }

  private cleanOfficialUrl(v: unknown): string | null {
    return cleanConcursoUrl(v);
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
      this.logger.warn(
        `OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
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
  ): Promise<string | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) return null;
    const model =
      this.config.get<string>('OPENAI_WEBSEARCH_MODEL') ?? 'gpt-4.1';

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
        tools: [{ type: 'web_search_preview' }],
        // Deixa o modelo escolher pesquisar; a busca custa mais mas é o ponto.
        tool_choice: 'auto',
      }),
    });
    if (!res.ok) {
      this.logger.warn(
        `OpenAI web_search ${res.status}: ${(await res.text()).slice(0, 240)}`,
      );
      return null;
    }
    const data = (await res.json()) as unknown;
    return extractResponsesText(data);
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
