import {
  ConcursoDiscoveryService,
  OpenAiUnavailableError,
  classifyCandidates,
  cleanConcursoUrl,
  cleanSeedUrl,
  extractCitations,
  isAggregatorHost,
  normalizeInstitution,
  parseCandidates,
  urlKey,
  type ExistingConcursoRef,
} from './concurso-discovery.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConcursoLinkService } from '../concurso/concurso-link.service';
import {
  FULL_SCRAPE,
  PageFetchError,
  VERIFY_SCRAPE,
} from './document-scraper.service';
import type { DocumentScraperService } from './document-scraper.service';
import type { ConcursoCostService } from './concurso-cost.service';

/** Registro de custo é contabilidade: os testes só precisam que não exploda. */
const costsStub = () =>
  ({
    record: jest.fn().mockResolvedValue(undefined),
  }) as unknown as ConcursoCostService;

// Trecho fiel do HTML real de /cargos/enfermeiro (dois concursos + links de vaga).
const FIXTURE = `
<ul class="link-d"><li><a
    href="https://www.pciconcursos.com.br/noticias/prefeitura-de-santos-sp-abre-cinco-editais-de-concursos-publicos"
    title="Prefeitura de Santos - SP abre cinco editais de concursos públicos"
    class="noticia_desc n293767">Prefeitura de Santos - SP <small><i class="fa-solid fa-external-link-square"></i></small></a></li></ul>
<ul class="link-i"><li><a href="https://www.pciconcursos.com.br/concursos/vagas/enfermeiro" title="Concursos para ENFERMEIRO"><i class="fas fa-staff-snake"></i>ENFERMEIRO</a></li></ul>
<ul class="link-d"><li><a
    href="https://www.pciconcursos.com.br/noticias/hospital-metropolitano-odilon-behrens-mg-abre-concurso"
    title="Hospital Metropolitano Odilon Behrens - MG abre concurso público"
    class="noticia_desc n293800">Hospital Metropolitano Odilon Behrens - MG <small><i class="fa-solid fa-external-link-square"></i></small></a></li></ul>
<ul class="link-i"><li><a href="https://www.pciconcursos.com.br/concursos/vagas/enfermeiro-intensivista" title="Concursos para ENFERMEIRO INTENSIVISTA">ENFERMEIRO INTENSIVISTA</a></li></ul>
`;

describe('parseCandidates', () => {
  it('extrai um candidato por a.noticia_desc, separando instituição e UF', () => {
    const candidates = parseCandidates(FIXTURE);
    expect(candidates).toHaveLength(2);

    expect(candidates[0]).toEqual({
      institution: 'Prefeitura de Santos',
      uf: 'SP',
      headline:
        'Prefeitura de Santos - SP abre cinco editais de concursos públicos',
      newsUrl:
        'https://www.pciconcursos.com.br/noticias/prefeitura-de-santos-sp-abre-cinco-editais-de-concursos-publicos',
    });
    expect(candidates[1].institution).toBe(
      'Hospital Metropolitano Odilon Behrens',
    );
    expect(candidates[1].uf).toBe('MG');
  });

  it('resolve href relativo e ignora os links de vaga (link-i)', () => {
    const candidates = parseCandidates(
      '<ul class="link-d"><li><a href="/noticias/prefeitura-de-x-ba-abre" title="Prefeitura de X - BA" class="noticia_desc">Prefeitura de X - BA</a></li></ul>' +
        '<ul class="link-i"><li><a href="/concursos/vagas/enfermeiro">ENFERMEIRO</a></li></ul>',
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].newsUrl).toBe(
      'https://www.pciconcursos.com.br/noticias/prefeitura-de-x-ba-abre',
    );
  });

  it('deduplica a mesma notícia repetida na página', () => {
    const row =
      '<ul class="link-d"><li><a href="https://www.pciconcursos.com.br/noticias/a" title="Prefeitura A - SP" class="noticia_desc">Prefeitura A - SP</a></li></ul>';
    expect(parseCandidates(row + row)).toHaveLength(1);
  });
});

describe('normalizeInstitution', () => {
  it('tira acento, caixa e pontuação, colapsa espaços', () => {
    expect(normalizeInstitution('Prefeitura de São João')).toBe(
      'prefeitura de sao joao',
    );
    expect(normalizeInstitution('  Câmara  Municipal- ')).toBe(
      'camara municipal',
    );
  });
});

describe('cleanConcursoUrl', () => {
  it('aceita a página específica do concurso na banca (com caminho)', () => {
    expect(cleanConcursoUrl('https://www.vunesp.com.br/PMJU2301')).toBe(
      'https://www.vunesp.com.br/PMJU2301',
    );
    expect(
      cleanConcursoUrl(
        'https://www.ibamsp-concursos.org.br/site/concursos/municipio/476',
      ),
    ).toBe('https://www.ibamsp-concursos.org.br/site/concursos/municipio/476');
  });

  it('rejeita home "pelada" (prefeitura ou banca) — não tem os editais', () => {
    expect(cleanConcursoUrl('https://www.vunesp.com.br/')).toBeNull();
    expect(cleanConcursoUrl('https://www.jundiai.sp.gov.br')).toBeNull();
    expect(cleanConcursoUrl('https://prefeitura.sp.gov.br/')).toBeNull();
  });

  it('rejeita agregadores/cursinhos e NOT_FOUND', () => {
    expect(
      cleanConcursoUrl('https://www.pciconcursos.com.br/noticias/x'),
    ).toBeNull();
    expect(
      cleanConcursoUrl('https://www.grancursosonline.com.br/x'),
    ).toBeNull();
    expect(cleanConcursoUrl('NOT_FOUND')).toBeNull();
    expect(cleanConcursoUrl(null)).toBeNull();
  });

  it('tira parâmetros de rastreamento (utm/fbclid)', () => {
    expect(
      cleanConcursoUrl('https://banca.org.br/concurso/1?utm_source=x&fbclid=y'),
    ).toBe('https://banca.org.br/concurso/1');
  });

  /* Regressão: o filtro de agregadores era um regex de SUBSTRING com entradas
   * como "concursos.com" — que casa dentro de "ibgpconcursos.com.br". O site da
   * banca IBGP era tratado como agregador e o link oficial de TODO concurso
   * dela era descartado antes mesmo da verificação. */
  it('não confunde banca com agregador por substring do domínio', () => {
    expect(
      cleanConcursoUrl('https://www.ibgpconcursos.com.br/pagina/faria-lemos'),
    ).toBe('https://www.ibgpconcursos.com.br/pagina/faria-lemos');
    expect(cleanConcursoUrl('https://seleconcursos.com.br/edital/1')).toBe(
      'https://seleconcursos.com.br/edital/1',
    );
    expect(isAggregatorHost('www.ibgpconcursos.com.br')).toBe(false);
    // O agregador de verdade (e seus subdomínios) segue barrado.
    expect(isAggregatorHost('www.pciconcursos.com.br')).toBe(true);
    expect(isAggregatorHost('m.qconcursos.com')).toBe(true);
    expect(isAggregatorHost('concursos.com.br')).toBe(true);
  });
});

describe('urlKey / extractCitations (anti-alucinação)', () => {
  it('urlKey ignora www, barra final, protocolo e query', () => {
    expect(urlKey('https://www.Banca.org.br/Concurso/1/')).toBe(
      'banca.org.br/concurso/1',
    );
    expect(urlKey('http://banca.org.br/concurso/1?utm=x')).toBe(
      'banca.org.br/concurso/1',
    );
  });

  it('extrai as url_citation das annotations da Responses API', () => {
    expect(
      extractCitations({
        output: [
          { type: 'web_search_call' },
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                annotations: [
                  { type: 'url_citation', url: 'https://a.org/x' },
                  { type: 'file_citation', url: 'https://ignorar.org' },
                  { type: 'url_citation', url: 'https://a.org/x' },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual(['https://a.org/x']);
  });

  it('resposta sem annotations vira lista vazia', () => {
    expect(extractCitations({})).toEqual([]);
    expect(extractCitations({ output: [{ type: 'message' }] })).toEqual([]);
  });
});

describe('cleanSeedUrl', () => {
  it('aceita home da banca (semente do 2º salto) e reduz à origem', () => {
    expect(cleanSeedUrl('https://www.ibgpconcursos.com.br/')).toBe(
      'https://www.ibgpconcursos.com.br',
    );
    // Candidata com caminho também serve como semente — vale o domínio.
    expect(cleanSeedUrl('https://www.vunesp.com.br/PMJU2301?x=1')).toBe(
      'https://www.vunesp.com.br',
    );
  });

  it('rejeita agregador e NOT_FOUND', () => {
    expect(cleanSeedUrl('https://www.pciconcursos.com.br/x')).toBeNull();
    expect(cleanSeedUrl('NOT_FOUND')).toBeNull();
    expect(cleanSeedUrl(null)).toBeNull();
  });
});

describe('classifyCandidates', () => {
  const candidates = parseCandidates(FIXTURE);

  it('marca "new" quando nada casa na base', () => {
    const result = classifyCandidates(candidates, []);
    expect(result.map((c) => c.status)).toEqual(['new', 'new']);
    expect(result[0].matched).toBeNull();
  });

  it('marca "exists" por URL da notícia (dedupe exato)', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c1',
        slug: 'santos-2026',
        institution: 'Outro Nome Qualquer',
        state: null,
        pciListingUrl: candidates[0].newsUrl,
      },
    ];
    const result = classifyCandidates(candidates, existing);
    expect(result[0].status).toBe('exists');
    expect(result[0].matched).toEqual({ id: 'c1', slug: 'santos-2026' });
    expect(result[1].status).toBe('new');
  });

  it('marca "exists" por instituição + UF quando não há URL salva', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c2',
        slug: null,
        institution: 'PREFEITURA DE SANTOS',
        state: 'SP',
        pciListingUrl: null,
      },
    ];
    const result = classifyCandidates(candidates, existing);
    expect(result[0].status).toBe('exists');
    expect(result[0].matched).toEqual({ id: 'c2', slug: null });
  });

  it('não casa quando a UF difere', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c3',
        slug: null,
        institution: 'Prefeitura de Santos',
        state: 'RJ',
        pciListingUrl: null,
      },
    ];
    expect(classifyCandidates(candidates, existing)[0].status).toBe('new');
  });
});

describe('listConcursosAdmin', () => {
  /** Linha crua do prisma; datas nulas => todos com o mesmo status (future). */
  const row = (
    institution: string,
    documentsCheckedAt: Date | null,
    closedAt: Date | null = null,
  ) => ({
    id: institution,
    slug: null,
    institution,
    state: 'SP',
    year: 2026,
    registrationStart: null,
    registrationEnd: null,
    examDate: null,
    resultDate: null,
    documentsSourceUrl: 'https://banca.org/x',
    documentsCheckedAt,
    editalUrl: null,
    pciListingUrl: null,
    closedAt,
    publishedAt: null,
    createdAt: new Date('2026-01-01'),
    _count: { examBases: 0, documents: 0, aiCosts: 0 },
  });

  const build = (rows: ReturnType<typeof row>[]) => {
    const prisma = {
      concurso: { findMany: jest.fn().mockResolvedValue(rows) },
      // Cargos de enfermagem entram no input da busca (desempate de certame).
      cargo: { findMany: jest.fn().mockResolvedValue([]) },
      // Custo acumulado por concurso (agregado numa query só na listagem).
      concursoAiCost: { groupBy: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    return new ConcursoDiscoveryService(
      {} as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {} as DocumentScraperService,
      costsStub(),
    );
  };

  it('expõe a última verificação em ISO (null quando nunca verificado)', async () => {
    const service = build([
      row('Nunca', null),
      row('Visto', new Date('2026-07-20T10:00:00Z')),
    ]);
    const result = await service.listConcursosAdmin();

    expect(
      result.find((r) => r.institution === 'Nunca')?.documentsCheckedAt,
    ).toBeNull();
    expect(
      result.find((r) => r.institution === 'Visto')?.documentsCheckedAt,
    ).toBe('2026-07-20T10:00:00.000Z');
  });

  it('ordena a fila de manutenção do mais parado para o mais recém-visto', async () => {
    const service = build([
      row('Recente', new Date('2026-07-30T00:00:00Z')),
      row('Antigo', new Date('2026-07-01T00:00:00Z')),
      row('Nunca', null),
    ]);

    expect(
      (await service.listConcursosAdmin()).map((r) => r.institution),
    ).toEqual(['Nunca', 'Antigo', 'Recente']);
  });

  it('encerrado vai para o fim mesmo estando parado há mais tempo', async () => {
    const service = build([
      row('Ativo', new Date('2026-07-30T00:00:00Z')),
      row('Fechado', null, new Date('2026-07-15T00:00:00Z')),
    ]);

    expect(
      (await service.listConcursosAdmin()).map((r) => r.institution),
    ).toEqual(['Ativo', 'Fechado']);
  });
});

/**
 * Exercita `findVerifiedConcursoLink` (privado) pela porta pública que só faz
 * busca + verificação. O caso que motivou: banca atrás de Cloudflare — a busca
 * acha o link certo, a raspagem de verificação lança, e o link era descartado.
 */
describe('reextractLinks — busca web + verificação', () => {
  const CANDIDATE = 'https://banca.org.br/concurso/santos-2026';
  const realFetch = global.fetch;
  afterAll(() => {
    global.fetch = realFetch;
  });

  /** O que interessa da chamada `concurso.update` do prisma. */
  interface UpdateArg {
    data: { documentsSourceUrl?: string };
  }
  /** Idem para o `findMany` — o teste só olha o filtro escolhido. */
  interface FindManyArg {
    where: Record<string, unknown>;
  }

  /** Monta o service com a busca web respondendo CANDIDATE e um scraper dado. */
  const build = (scrapeDocuments: jest.Mock, saved: string | null = null) => {
    const update = jest
      .fn<Promise<unknown>, [UpdateArg]>()
      .mockResolvedValue({});
    const findMany = jest
      .fn<Promise<unknown>, [FindManyArg]>()
      .mockResolvedValue([
        {
          id: 'c1',
          institution: 'Prefeitura de Santos',
          state: 'SP',
          city: 'Santos',
          year: 2026,
          documentsSourceUrl: saved,
        },
      ]);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'c1',
      institution: 'Prefeitura de Santos',
      state: 'SP',
      city: 'Santos',
      year: 2026,
      documentsSourceUrl: saved,
    });
    const prisma = {
      concurso: { findMany, findUnique, update },
      // Cargos de enfermagem entram no input da busca (desempate de certame).
      cargo: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    // A resposta precisa CITAR a URL: candidata não citada é tratada como
    // inventada e não entra na verificação (ver anti-alucinação no service).
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          output_text: JSON.stringify({
            officialContestUrl: CANDIDATE,
            organizerUrl: 'NOT_FOUND',
          }),
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    officialContestUrl: CANDIDATE,
                    organizerUrl: 'NOT_FOUND',
                  }),
                  annotations: [{ type: 'url_citation', url: CANDIDATE }],
                },
              ],
            },
          ],
        }),
    }) as unknown as typeof fetch;

    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      // fetchPageHtml → null: o 2º salto (site da banca) não rende nada, então
      // cada teste isola o comportamento da busca web + verificação.
      {
        scrapeDocuments,
        fetchPageHtml: jest.fn().mockResolvedValue(null),
      } as unknown as DocumentScraperService,
      costsStub(),
    );
    return { service, update, findMany };
  };

  /* Caso real (Prefeitura de Mondaí): a AMEOSC responde 403 em TUDO, e a busca
   * web devolveu uma URL inventada. Aceitar "bloqueado" como provável salvava um
   * link que, no navegador do admin, dava "página não encontrada". */
  it('DESCARTA link da busca web que a origem bloqueou (pode ser inventado)', async () => {
    const { service, update } = build(
      jest.fn().mockRejectedValue(new PageFetchError(403, 'bloqueado')),
    );

    expect(await service.reextractLinks()).toMatchObject({
      updated: 0,
      stillMissing: 1,
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );
  });

  /* As citações são URLs reais da busca — entram como candidatas EXTRAS. Não
   * servem de filtro: medimos 0 annotations quando o prompt exige JSON. */
  it('citações da busca viram candidatas extras', async () => {
    const CITADA = 'https://outra-banca.org.br/concurso/2026';
    const row = {
      id: 'c1',
      institution: 'Prefeitura X',
      state: 'SC',
      city: 'X',
      year: 2026,
      documentsSourceUrl: null,
    };
    const update = jest
      .fn<Promise<unknown>, [UpdateArg]>()
      .mockResolvedValue({});
    const prisma = {
      concurso: {
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update,
      },
      // Cargos de enfermagem entram no input da busca (desempate de certame).
      cargo: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            String(url).includes('/responses')
              ? {
                  output: [
                    {
                      type: 'message',
                      content: [
                        {
                          type: 'output_text',
                          // O modelo erra a URL; a busca citou a certa.
                          text: JSON.stringify({
                            officialContestUrl:
                              'https://banca.org.br/inventado',
                            organizerUrl: 'NOT_FOUND',
                          }),
                          annotations: [{ type: 'url_citation', url: CITADA }],
                        },
                      ],
                    },
                  ],
                }
              : { choices: [{ message: { content: '{}' } }] },
          ),
      }),
    ) as unknown as typeof fetch;

    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {
        scrapeDocuments: jest
          .fn()
          .mockImplementation((u: string) =>
            u === CITADA
              ? Promise.resolve({ documents: [{ url: 'https://x/e.pdf' }] })
              : Promise.resolve({ documents: [] }),
          ),
        fetchPageHtml: jest.fn().mockResolvedValue(null),
      } as unknown as DocumentScraperService,
      costsStub(),
    );

    expect(await service.reextractLinks()).toMatchObject({ updated: 1 });
    expect(update.mock.calls[0][0].data.documentsSourceUrl).toBe(CITADA);
  });

  /* Caso Mondaí 2026: a prefeitura abriu DOIS certames — Concurso Público
   * 039 (sem enfermeiro) e Processo Seletivo 043 (com). Sem dizer o cargo, a
   * busca trazia o 039, que casa com "concurso público". */
  it('manda o cargo de enfermagem no input para desempatar o certame', async () => {
    const row = {
      id: 'c1',
      institution: 'Prefeitura de Mondaí',
      state: 'SC',
      city: 'Mondaí',
      year: 2026,
      documentsSourceUrl: null,
    };
    const prisma = {
      concurso: {
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({}),
      },
      cargo: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { role: 'Enfermeiro' },
            { role: 'Enfermeiro PSF' },
          ]),
      },
    } as unknown as PrismaService;

    const fetchMock = jest
      .fn<Promise<unknown>, [string, { body?: string }]>()
      .mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ output_text: '{}' }),
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {
        scrapeDocuments: jest.fn(),
        fetchPageHtml: jest.fn().mockResolvedValue(null),
      } as unknown as DocumentScraperService,
      costsStub(),
    );

    await service.findLinkForConcurso('c1');

    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain('CARGO DE INTERESSE');
    expect(body).toContain('Enfermeiro PSF');
    expect(body).toContain('MAIS DE UM certame');
  });

  it('404 na candidata é rejeição, não bloqueio', async () => {
    const { service, update } = build(
      jest.fn().mockRejectedValue(new PageFetchError(404, 'não existe')),
    );

    expect(await service.reextractLinks()).toMatchObject({ updated: 0 });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );
  });

  it('link não verificado NÃO é salvo — vira sugestão para o admin', async () => {
    const REAL = 'https://banca.org.br/concursos/mondai';
    const update = jest
      .fn<Promise<unknown>, [UpdateArg]>()
      .mockResolvedValue({});
    const row = {
      id: 'c1',
      institution: 'Prefeitura de Mondaí',
      state: 'SC',
      city: 'Mondaí',
      year: 2026,
      documentsSourceUrl: null,
    };
    const prisma = {
      concurso: {
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update,
      },
      // Cargos de enfermagem entram no input da busca (desempate de certame).
      cargo: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    // Mock por ENDPOINT (não por ordem): o teste faz duas operações seguidas e
    // um contador de chamadas daria respostas trocadas na segunda.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const payload = String(url).includes('/responses')
        ? {
            output_text: JSON.stringify({
              officialContestUrl: 'NOT_FOUND',
              organizerUrl: 'https://banca.org.br/',
            }),
          }
        : {
            choices: [
              { message: { content: JSON.stringify({ concursoUrl: REAL }) } },
            ],
          };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
      });
    }) as unknown as typeof fetch;

    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {
        // A página do concurso bloqueia, mas o LINK veio do site da banca.
        scrapeDocuments: jest
          .fn()
          .mockRejectedValue(new PageFetchError(403, 'bloqueado')),
        fetchPageHtml: jest
          .fn()
          .mockResolvedValue('<a href="/concursos/mondai">Mondaí</a>'),
      } as unknown as DocumentScraperService,
      costsStub(),
    );

    // Em massa, só confirmado entra no banco.
    expect(await service.reextractLinks()).toMatchObject({ updated: 0 });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );

    // Por concurso, o candidato volta como sugestão — o admin abre e decide.
    expect(await service.findLinkForConcurso('c1')).toMatchObject({
      found: false,
      suggestion: { url: REAL, origin: 'site da banca' },
    });
  });

  it('rejeita o link quando a página foi lida e não lista documentos', async () => {
    const { service, update } = build(
      jest.fn().mockResolvedValue({ documents: [] }),
    );

    expect(await service.reextractLinks()).toMatchObject({
      updated: 0,
      stillMissing: 1,
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );
  });

  it('preserva o link já salvo quando a busca não acha nada', async () => {
    const manual = 'https://colado-a-mao.org.br/concurso/2026';
    const { service, update } = build(
      jest.fn().mockResolvedValue({ documents: [] }),
      manual,
    );

    // Não conta como "faltando": o concurso segue com o link manual.
    expect(await service.reextractLinks()).toMatchObject({
      updated: 0,
      stillMissing: 0,
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );
  });

  it('confirma o link quando a página lista documentos', async () => {
    const docs = { documents: [{ url: 'https://banca.org.br/e.pdf' }] };
    const { service, update } = build(jest.fn().mockResolvedValue(docs));

    expect(await service.reextractLinks()).toMatchObject({ updated: 1 });
    expect(update.mock.calls[0][0].data.documentsSourceUrl).toBe(CANDIDATE);
  });

  /* Guarda de CUSTO: o alvo em massa é só quem está sem link e ativo. O modo
   * "revalidar todos os do pciconcursos" foi removido — rodava busca web em
   * ~100 concursos já resolvidos e queimou o crédito da OpenAI. */
  it('mira apenas os concursos ativos que estão sem link', async () => {
    const { service, findMany } = build(
      jest.fn().mockResolvedValue({ documents: [] }),
    );

    await service.reextractLinks();
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { documentsSourceUrl: null, closedAt: null },
    });
  });

  /* Guarda de CUSTO: verificar link é "esta página lista documentos?", não
   * "liste os documentos". Mandar a página inteira (200k chars ≈ 54k tokens)
   * custava mais que a própria busca web, por candidata. */
  it('verifica o link com o perfil enxuto, não com a raspagem cheia', async () => {
    const scrapeDocuments = jest.fn().mockResolvedValue({ documents: [] });
    const { service } = build(scrapeDocuments);

    await service.reextractLinks();

    expect(scrapeDocuments).toHaveBeenCalledWith(
      expect.any(String),
      VERIFY_SCRAPE,
      expect.anything(), // medidor de custo
    );
    // E o perfil enxuto é de fato uma fração do cheio.
    expect(VERIFY_SCRAPE.maxChars).toBeLessThan(FULL_SCRAPE.maxChars / 4);
  });

  it('findLinkForConcurso confirma e salva o link de UM concurso', async () => {
    const docs = { documents: [{ url: 'https://banca.org.br/e.pdf' }] };
    const { service, update } = build(jest.fn().mockResolvedValue(docs));

    expect(await service.findLinkForConcurso('c1')).toMatchObject({
      found: true,
      url: CANDIDATE,
      verified: true,
      docCount: 1,
      previousUrl: null,
    });
    expect(update.mock.calls[0][0].data.documentsSourceUrl).toBe(CANDIDATE);
  });

  it('findLinkForConcurso não devolve link da busca web bloqueado', async () => {
    const { service } = build(
      jest.fn().mockRejectedValue(new PageFetchError(403, 'bloqueado')),
    );

    // Sem procedência confiável, "não achei" — o admin cola o link na mão.
    expect(await service.findLinkForConcurso('c1')).toMatchObject({
      found: false,
      url: null,
    });
  });

  it('findLinkForConcurso preserva o link salvo quando não acha nada', async () => {
    const manual = 'https://colado-a-mao.org.br/concurso/2026';
    const { service, update } = build(
      jest.fn().mockResolvedValue({ documents: [] }),
      manual,
    );

    expect(await service.findLinkForConcurso('c1')).toMatchObject({
      found: false,
      url: manual,
      previousUrl: manual,
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty(
      'documentsSourceUrl',
    );
  });

  /* Caso real (Prefeitura de Faria Lemos 2026): a busca web acerta a BANCA
   * (IBGP) mas devolve uma URL de concurso DEDUZIDA que dá 404. O 2º salto parte
   * da home da banca — antes descartada por `cleanConcursoUrl` — segue a página
   * de listagem e acha o link que EXISTE. */
  it('2º salto: usa a home da banca da busca para achar o link real', async () => {
    const REAL = 'https://www.ibgpconcursos.com.br/pagina/faria-lemos';
    const HALLUCINATED = 'https://www.ibgpconcursos.com.br/concurso/inventado';

    const update = jest
      .fn<Promise<unknown>, [UpdateArg]>()
      .mockResolvedValue({});
    const prisma = {
      concurso: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            institution: 'Prefeitura de Faria Lemos',
            state: 'MG',
            city: 'Faria Lemos',
            year: 2026,
            documentsSourceUrl: null,
          },
        ]),
        update,
      },
      // Cargos de enfermagem entram no input da busca (desempate de certame).
      cargo: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    // 1ª chamada = busca web (URL deduzida + home da banca); as seguintes são o
    // 2º salto pedindo à IA o link do concurso na página raspada.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const payload = String(url).includes('/responses')
        ? {
            output_text: JSON.stringify({
              officialContestUrl: HALLUCINATED,
              organizerUrl: 'https://www.ibgpconcursos.com.br/',
            }),
          }
        : {
            choices: [
              { message: { content: JSON.stringify({ concursoUrl: REAL }) } },
            ],
          };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(payload),
      });
    }) as unknown as typeof fetch;

    // A URL deduzida não lista nada (404 → página vazia); a real lista o edital.
    const scrapeDocuments = jest
      .fn()
      .mockImplementation((url: string) =>
        url === REAL
          ? Promise.resolve({ documents: [{ url: 'https://ibgp/edital.pdf' }] })
          : Promise.resolve({ documents: [] }),
      );

    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {
        scrapeDocuments,
        fetchPageHtml: jest
          .fn()
          .mockResolvedValue('<a href="/pagina/faria-lemos">Faria Lemos</a>'),
      } as unknown as DocumentScraperService,
      costsStub(),
    );

    expect(await service.reextractLinks()).toMatchObject({ updated: 1 });
    expect(update.mock.calls[0][0].data.documentsSourceUrl).toBe(REAL);
  });

  it('aborta com erro claro quando a OpenAI recusa por falta de crédito', async () => {
    const { service, update } = build(
      jest.fn().mockResolvedValue({ documents: [] }),
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('{"error":{"type":"insufficient_quota"}}'),
    }) as unknown as typeof fetch;

    // Não degrada para "0 encontrados": a causa real sobe até o chamador, e o
    // loop para em vez de repetir o mesmo erro nos N concursos seguintes.
    await expect(service.reextractLinks()).rejects.toThrow(
      OpenAiUnavailableError,
    );
    await expect(service.reextractLinks()).rejects.toThrow(/sem créditos/);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('add — fase 1 (cadastro sem IA)', () => {
  const candidate = {
    institution: 'Prefeitura de Santos',
    uf: 'SP',
    headline: 'Prefeitura de Santos abre concurso 2027 com vagas de enfermeiro',
    newsUrl: 'https://www.pciconcursos.com.br/noticias/santos-2027',
  };

  const build = () => {
    const update = jest.fn().mockResolvedValue({
      id: 'c1',
      slug: null,
      institution: candidate.institution,
    });
    const prisma = {
      concurso: { findMany: jest.fn().mockResolvedValue([]), update },
      cargo: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'cargo-1' }),
      },
    } as unknown as PrismaService;
    const findOrCreateConcurso = jest.fn().mockResolvedValue({ id: 'c1' });
    const service = new ConcursoDiscoveryService(
      { get: () => 'sk-test' } as unknown as ConfigService,
      prisma,
      { findOrCreateConcurso } as unknown as ConcursoLinkService,
      {} as DocumentScraperService,
      costsStub(),
    );
    return { service, prisma, update, findOrCreateConcurso };
  };

  it('não faz NENHUMA chamada de rede/IA ao adicionar', async () => {
    // O ponto do fluxo faseado: adicionar 70 concursos não pode custar nada.
    // Antes, cada add lia a notícia com IA e disparava uma busca web.
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { service } = build();

    await service.add(candidate);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cria como RASCUNHO e sem carimbar verificação', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { service, update } = build();

    const res = await service.add(candidate);

    expect(res.created).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pciListingUrl: candidate.newsUrl }),
      }),
    );
    // `documentsCheckedAt` mentiria: nada foi verificado nesta fase, e o
    // rótulo "verificado hoje" da fila sairia errado no dia 1.
    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect('documentsCheckedAt' in data).toBe(false);
    expect('documentsSourceUrl' in data).toBe(false);
  });

  it('NÃO inventa um cargo "Enfermeiro" — a fase 1 não sabe quais são', async () => {
    // Regressão: o cargo default era um chute (a listagem do pciconcursos não
    // diz os cargos) e a análise do edital transcrevia as atribuições NELE —
    // inclusive as de um cargo de nome parecido —, publicando ficha errada,
    // enquanto o cargo verdadeiro nascia como "cargo novo" ao lado.
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { service, prisma } = build();

    await service.add(candidate);

    expect(prisma.cargo.create).not.toHaveBeenCalled();
  });

  it('tira o ano da manchete, sem precisar ler a notícia', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { service, findOrCreateConcurso } = build();

    await service.add(candidate);

    expect(findOrCreateConcurso).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2027, state: 'SP', city: null }),
    );
  });

  it('pede o rascunho na CRIAÇÃO, sem despublicar concurso já existente', async () => {
    // `findOrCreateConcurso` pode ENCONTRAR um concurso publicado (chave mais
    // frouxa que a dedupe do add); zerar publishedAt num update tiraria do ar
    // um concurso real.
    global.fetch = jest.fn() as unknown as typeof fetch;
    const { service, findOrCreateConcurso, update } = build();

    await service.add(candidate);

    expect(findOrCreateConcurso).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true }),
    );
    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect('publishedAt' in data).toBe(false);
  });
});
