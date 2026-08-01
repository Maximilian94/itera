import {
  ConcursoDiscoveryService,
  classifyCandidates,
  cleanConcursoUrl,
  normalizeInstitution,
  parseCandidates,
  type ExistingConcursoRef,
} from './concurso-discovery.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConcursoLinkService } from '../concurso/concurso-link.service';
import type { DocumentScraperService } from './document-scraper.service';

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
    closedAt,
    createdAt: new Date('2026-01-01'),
    _count: { examBases: 0 },
  });

  const build = (rows: ReturnType<typeof row>[]) => {
    const prisma = {
      concurso: { findMany: jest.fn().mockResolvedValue(rows) },
    } as unknown as PrismaService;
    return new ConcursoDiscoveryService(
      {} as ConfigService,
      prisma,
      {} as ConcursoLinkService,
      {} as DocumentScraperService,
    );
  };

  it('expõe a última verificação em ISO (null quando nunca verificado)', async () => {
    const service = build([row('Nunca', null), row('Visto', new Date('2026-07-20T10:00:00Z'))]);
    const result = await service.listConcursosAdmin();

    expect(result.find((r) => r.institution === 'Nunca')?.documentsCheckedAt).toBeNull();
    expect(result.find((r) => r.institution === 'Visto')?.documentsCheckedAt).toBe(
      '2026-07-20T10:00:00.000Z',
    );
  });

  it('ordena a fila de manutenção do mais parado para o mais recém-visto', async () => {
    const service = build([
      row('Recente', new Date('2026-07-30T00:00:00Z')),
      row('Antigo', new Date('2026-07-01T00:00:00Z')),
      row('Nunca', null),
    ]);

    expect((await service.listConcursosAdmin()).map((r) => r.institution)).toEqual([
      'Nunca',
      'Antigo',
      'Recente',
    ]);
  });

  it('encerrado vai para o fim mesmo estando parado há mais tempo', async () => {
    const service = build([
      row('Ativo', new Date('2026-07-30T00:00:00Z')),
      row('Fechado', null, new Date('2026-07-15T00:00:00Z')),
    ]);

    expect((await service.listConcursosAdmin()).map((r) => r.institution)).toEqual([
      'Ativo',
      'Fechado',
    ]);
  });
});
