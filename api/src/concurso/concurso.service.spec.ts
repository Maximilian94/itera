import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { GovernmentScope, Prisma } from '@prisma/client';
import { ConcursoService } from './concurso.service';
import { ConcursoLinkService } from './concurso-link.service';
import { PrismaService } from '../prisma/prisma.service';

const EXAM_BASE_ID = 'eb-1';

function buildCurrent(overrides: Record<string, unknown> = {}) {
  return {
    id: EXAM_BASE_ID,
    institution: 'Prefeitura de Campinas',
    examDate: new Date('2026-06-15T00:00:00.000Z'),
    governmentScope: GovernmentScope.MUNICIPAL,
    state: 'SP',
    city: 'Campinas',
    examBoardId: 'board-1',
    examBoard: { alias: 'CEBRASPE', name: 'Cebraspe (Cespe/UnB)' },
    concursoId: null,
    ...overrides,
  };
}

describe('ConcursoService.getConcursoProvas (slug + editalUrl lazy-link)', () => {
  let service: ConcursoService;
  let prisma: {
    user: { findUnique: jest.Mock };
    examBase: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    concurso: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    examBaseAttempt: { groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      examBase: {
        findFirst: jest.fn().mockResolvedValue(buildCurrent()),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      concurso: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({
              id: 'concurso-1',
              editalUrl: null,
              ...args.data,
            }),
          ),
        update: jest
          .fn()
          .mockImplementation(
            (args: { where: { id: string }; data: Record<string, unknown> }) =>
              Promise.resolve({
                id: args.where.id,
                institution: 'Prefeitura de Campinas',
                year: 2026,
                governmentScope: GovernmentScope.MUNICIPAL,
                state: 'SP',
                city: 'Campinas',
                editalUrl: null,
                ...args.data,
              }),
          ),
      },
      examBaseAttempt: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConcursoService,
        ConcursoLinkService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConcursoService);
  });

  it('cria o concurso com slug institution+year+banca', async () => {
    const result = await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'prefeitura-de-campinas-2026-cebraspe',
      }) as object,
    });
    expect(result.concurso?.slug).toBe('prefeitura-de-campinas-2026-cebraspe');
  });

  it('remove acentos e gera slug sem banca quando exam board é nulo', async () => {
    prisma.examBase.findFirst.mockResolvedValue(
      buildCurrent({
        institution: 'Câmara de São Paulo',
        examBoardId: null,
        examBoard: null,
      }),
    );

    await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'camara-de-sao-paulo-2026',
      }) as object,
    });
  });

  it('acrescenta sufixo numérico quando o slug natural já existe', async () => {
    prisma.concurso.findUnique
      .mockResolvedValueOnce({ id: 'other-concurso' }) // base taken
      .mockResolvedValueOnce(null); // base-2 free

    await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'prefeitura-de-campinas-2026-cebraspe-2',
      }) as object,
    });
  });

  it('self-heal: concurso existente sem slug ganha um na leitura', async () => {
    prisma.concurso.findFirst.mockResolvedValue({
      id: 'concurso-legacy',
      slug: null,
      institution: 'Prefeitura de Campinas',
      year: 2026,
      governmentScope: GovernmentScope.MUNICIPAL,
      state: 'SP',
      city: 'Campinas',
      editalUrl: null,
    });

    const result = await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.update).toHaveBeenCalledWith({
      where: { id: 'concurso-legacy' },
      data: { slug: 'prefeitura-de-campinas-2026-cebraspe' },
    });
    expect(prisma.concurso.create).not.toHaveBeenCalled();
    expect(result.concurso?.slug).toBe('prefeitura-de-campinas-2026-cebraspe');
  });

  it('concurso existente com slug não é tocado', async () => {
    prisma.concurso.findFirst.mockResolvedValue({
      id: 'concurso-1',
      slug: 'prefeitura-de-campinas-2026-cebraspe',
      institution: 'Prefeitura de Campinas',
      year: 2026,
      governmentScope: GovernmentScope.MUNICIPAL,
      state: 'SP',
      city: 'Campinas',
      editalUrl: 'https://example.com/edital.pdf',
    });

    const result = await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.update).not.toHaveBeenCalled();
    expect(prisma.concurso.create).not.toHaveBeenCalled();
    expect(result.concurso?.editalUrl).toBe('https://example.com/edital.pdf');
  });

  it('self-heal: editalUrl do concurso vem da prova mais antiga com valor', async () => {
    prisma.concurso.findFirst.mockResolvedValue({
      id: 'concurso-1',
      slug: 'prefeitura-de-campinas-2026-cebraspe',
      institution: 'Prefeitura de Campinas',
      year: 2026,
      governmentScope: GovernmentScope.MUNICIPAL,
      state: 'SP',
      city: 'Campinas',
      editalUrl: null,
    });
    prisma.examBase.findMany.mockResolvedValue([
      {
        id: 'eb-2',
        role: 'Enfermeiro',
        slug: null,
        salaryBase: null,
        vacancyCount: null,
        examDate: new Date('2026-07-01T00:00:00.000Z'),
        examBoardId: 'board-1',
        published: true,
        minPassingGradeNonQuota: null,
        editalUrl: 'https://example.com/edital-b.pdf',
        isNursingRelevant: true,
        _count: { questions: 0 },
      },
      {
        id: EXAM_BASE_ID,
        role: 'Técnico de Enfermagem',
        slug: null,
        salaryBase: null,
        vacancyCount: null,
        examDate: new Date('2026-06-15T00:00:00.000Z'),
        examBoardId: 'board-1',
        published: true,
        minPassingGradeNonQuota: null,
        editalUrl: 'https://example.com/edital-a.pdf',
        isNursingRelevant: true,
        _count: { questions: 0 },
      },
    ]);

    const result = await service.getConcursoProvas(EXAM_BASE_ID);

    expect(prisma.concurso.update).toHaveBeenCalledWith({
      where: { id: 'concurso-1' },
      data: { editalUrl: 'https://example.com/edital-a.pdf' },
    });
    expect(result.concurso?.editalUrl).toBe('https://example.com/edital-a.pdf');
  });

  describe('ano da chave de agrupamento em UTC (T1.2)', () => {
    // O script `npm test` roda o Jest com TZ=America/Sao_Paulo — o fuso não
    // pode ser trocado em runtime (o V8 cacheia no primeiro uso de Date).
    it('examDate à meia-noite UTC de 1º/jan → ano UTC, não o do fuso do servidor', async () => {
      const midnightUtcJan1 = new Date('2026-01-01T00:00:00.000Z');
      // Sanidade: no fuso de SP essa data ainda é 31/12/2025.
      expect(midnightUtcJan1.getFullYear()).toBe(2025);
      prisma.examBase.findFirst.mockResolvedValue(
        buildCurrent({ examDate: midnightUtcJan1 }),
      );

      await service.getConcursoProvas(EXAM_BASE_ID);

      expect(prisma.concurso.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          year: 2026,
          slug: 'prefeitura-de-campinas-2026-cebraspe',
        }) as object,
      });
      // O range do ano (já em UTC) encontra a prova: 2026-01-01 ∈ [start, end).
      expect(prisma.examBase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            examDate: {
              gte: new Date(Date.UTC(2026, 0, 1)),
              lt: new Date(Date.UTC(2027, 0, 1)),
            },
          }) as object,
        }),
      );
    });
  });

  describe('find-or-create: corrida de criação (T1.1)', () => {
    const p2002 = () =>
      new Prisma.PrismaClientKnownRequestError('unique constraint violated', {
        code: 'P2002',
        clientVersion: '6.19.2',
      });

    it('findFirst da tupla é determinístico (createdAt asc)', async () => {
      await service.getConcursoProvas(EXAM_BASE_ID);

      expect(prisma.concurso.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('P2002 no create (perdeu a corrida) → retorna a linha existente sem lançar', async () => {
      const winner = {
        id: 'concurso-winner',
        slug: 'prefeitura-de-campinas-2026-cebraspe',
        institution: 'Prefeitura de Campinas',
        year: 2026,
        governmentScope: GovernmentScope.MUNICIPAL,
        state: 'SP',
        city: 'Campinas',
        editalUrl: null,
      };
      prisma.concurso.findFirst
        .mockResolvedValueOnce(null) // antes do create: ainda não existe
        .mockResolvedValueOnce(winner); // retry pós-P2002: o vencedor da corrida
      prisma.concurso.create.mockRejectedValue(p2002());

      const result = await service.getConcursoProvas(EXAM_BASE_ID);

      expect(result.concurso?.id).toBe('concurso-winner');
      expect(prisma.concurso.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
      );
    });

    it('erro que não é P2002 propaga com a causa original', async () => {
      const boom = new Error('connection reset');
      prisma.concurso.create.mockRejectedValue(boom);

      await expect(service.getConcursoProvas(EXAM_BASE_ID)).rejects.toBe(boom);
    });

    it('P2002 mas o retry não encontra a linha → erro com a causa encadeada', async () => {
      prisma.concurso.findFirst.mockResolvedValue(null);
      prisma.concurso.create.mockRejectedValue(p2002());

      await expect(service.getConcursoProvas(EXAM_BASE_ID)).rejects.toThrow(
        'Failed to find or create concurso',
      );
    });
  });

  describe('filtro de relevância (isNursingRelevant, MAX-13)', () => {
    function buildProva(overrides: Record<string, unknown> = {}) {
      return {
        id: 'eb-x',
        role: 'Enfermeiro',
        slug: null,
        salaryBase: null,
        vacancyCount: 10,
        examDate: new Date('2026-06-15T00:00:00.000Z'),
        examBoardId: 'board-1',
        published: true,
        minPassingGradeNonQuota: null,
        editalUrl: null,
        isNursingRelevant: true,
        _count: { questions: 0 },
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.concurso.findFirst.mockResolvedValue({
        id: 'concurso-1',
        slug: 'prefeitura-de-campinas-2026-cebraspe',
        institution: 'Prefeitura de Campinas',
        year: 2026,
        governmentScope: GovernmentScope.MUNICIPAL,
        state: 'SP',
        city: 'Campinas',
        editalUrl: 'https://example.com/edital.pdf',
      });
    });

    it('prova não relevante (Médico) sai do payload, mas ainda é vinculada ao concurso', async () => {
      prisma.examBase.findMany.mockResolvedValue([
        buildProva({ id: EXAM_BASE_ID, role: 'Enfermeiro' }),
        buildProva({
          id: 'eb-medico',
          role: 'Médico Clínico',
          isNursingRelevant: false,
          vacancyCount: 50,
        }),
      ]);

      const result = await service.getConcursoProvas(EXAM_BASE_ID);

      expect(result.provas).toHaveLength(1);
      expect(result.provas[0].role).toBe('Enfermeiro');
      // O self-healing link continua cobrindo TODOS os siblings.
      expect(prisma.examBase.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [EXAM_BASE_ID, 'eb-medico'] },
          concursoId: null,
        },
        data: { concursoId: 'concurso-1' },
      });
    });

    it('stats do usuário só consideram provas relevantes', async () => {
      prisma.examBase.findMany.mockResolvedValue([
        buildProva({ id: EXAM_BASE_ID, role: 'Enfermeiro' }),
        buildProva({
          id: 'eb-medico',
          role: 'Médico Clínico',
          isNursingRelevant: false,
        }),
      ]);

      await service.getConcursoProvas(EXAM_BASE_ID, 'user-1');

      expect(prisma.examBaseAttempt.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            examBaseId: { in: [EXAM_BASE_ID] },
          }) as object,
        }),
      );
    });

    it('concurso onde todas as provas são irrelevantes responde provas: []', async () => {
      prisma.examBase.findMany.mockResolvedValue([
        buildProva({
          id: 'eb-medico',
          role: 'Médico',
          isNursingRelevant: false,
        }),
        buildProva({
          id: 'eb-adm',
          role: 'Assistente Administrativo',
          isNursingRelevant: false,
        }),
      ]);

      const result = await service.getConcursoProvas(EXAM_BASE_ID, 'user-1');

      expect(result.concurso).not.toBeNull();
      expect(result.provas).toEqual([]);
      // Sem provas relevantes, não há por que consultar stats.
      expect(prisma.examBaseAttempt.groupBy).not.toHaveBeenCalled();
    });
  });
});

describe('ConcursoService.getConcursoDetail (página do concurso, MAX-15)', () => {
  const CONCURSO = {
    id: 'concurso-1',
    slug: 'prefeitura-de-campinas-2026-cebraspe',
    institution: 'Prefeitura de Campinas',
    year: 2026,
    governmentScope: GovernmentScope.MUNICIPAL,
    state: 'SP',
    city: 'Campinas',
    editalUrl: 'https://example.com/edital.pdf',
    examBoardId: 'board-1',
    examBoard: {
      id: 'board-1',
      name: 'Cebraspe (Cespe/UnB)',
      alias: 'CEBRASPE',
    },
  };

  let service: ConcursoService;
  let prisma: {
    user: { findUnique: jest.Mock };
    examBase: { findMany: jest.Mock; updateMany: jest.Mock };
    concurso: { findFirst: jest.Mock; update: jest.Mock };
    cargo: { findMany: jest.Mock };
    examBaseAttempt: { groupBy: jest.Mock };
  };
  let concursoLink: { ensureDefaultCargo: jest.Mock };

  /** Prova (query da tupla): só temporais + heal (a ficha mora no Cargo). */
  function buildProva(overrides: Record<string, unknown> = {}) {
    return {
      id: 'eb-enfermeiro',
      examDate: new Date('2026-07-12T00:00:00.000Z'),
      registrationStart: new Date('2026-05-01T00:00:00.000Z'),
      registrationEnd: new Date('2026-05-31T00:00:00.000Z'),
      resultDate: new Date('2026-09-30T00:00:00.000Z'),
      editalUrl: null,
      isNursingRelevant: true,
      cargoProvas: [{ cargoId: 'eb-enfermeiro' }],
      _count: { questions: 120 },
      ...overrides,
    };
  }

  /** Card de cargo: ficha do model Cargo + provas vinculadas. */
  function buildCargoRow(overrides: Record<string, unknown> = {}) {
    const base = {
      id: 'eb-enfermeiro',
      slug: 'pref-campinas-2026-enfermeiro',
      role: 'Enfermeiro',
      vacancyCount: 20,
      hasReserveList: false,
      salaryBase: '8500',
      workload: '40h semanais',
      registrationFee: '90',
      minPassingGradeNonQuota: '60',
      ...overrides,
    };
    return {
      provas: [
        {
          isOficial: true,
          examBase: {
            id: base.id,
            published: true,
            _count: { questions: 120 },
          },
        },
      ],
      ...base,
    };
  }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      examBase: {
        findMany: jest.fn().mockResolvedValue([buildProva()]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      concurso: {
        findFirst: jest.fn().mockResolvedValue({ ...CONCURSO }),
        update: jest.fn(),
      },
      cargo: { findMany: jest.fn().mockResolvedValue([buildCargoRow()]) },
      examBaseAttempt: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    concursoLink = { ensureDefaultCargo: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConcursoService,
        { provide: ConcursoLinkService, useValue: concursoLink },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConcursoService);

    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('404 para slug inexistente', async () => {
    prisma.concurso.findFirst.mockResolvedValue(null);

    await expect(service.getConcursoDetail('nao-existe')).rejects.toThrow(
      'concurso not found',
    );
  });

  it('busca por slug ou por UUID', async () => {
    await service.getConcursoDetail(CONCURSO.slug);
    expect(prisma.concurso.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { slug: CONCURSO.slug } }),
    );

    await service.getConcursoDetail('11111111-2222-3333-4444-555555555555');
    expect(prisma.concurso.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: '11111111-2222-3333-4444-555555555555' },
      }),
    );
  });

  it('anônimo: payload completo com stats zeradas, sem consultar attempts', async () => {
    const result = await service.getConcursoDetail(CONCURSO.slug);

    expect(prisma.examBaseAttempt.groupBy).not.toHaveBeenCalled();
    expect(result.cargos[0].userStats).toEqual({
      attemptCount: 0,
      bestScore: null,
    });
    expect(result.concurso.examBoard).toEqual({
      id: 'board-1',
      name: 'Cebraspe (Cespe/UnB)',
      alias: 'CEBRASPE',
    });
    // Cards vêm do model Cargo, filtrados por relevância no banco.
    expect(prisma.cargo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { concursoId: CONCURSO.id, isNursingRelevant: true },
      }),
    );
  });

  it('autenticado: stats do usuário mapeadas por cargo', async () => {
    prisma.examBaseAttempt.groupBy.mockResolvedValue([
      {
        examBaseId: 'eb-enfermeiro',
        _count: { id: 3 },
        _max: { scorePercentage: '72' },
      },
    ]);

    const result = await service.getConcursoDetail(CONCURSO.slug, 'user-1');

    expect(result.cargos[0].userStats).toEqual({
      attemptCount: 3,
      bestScore: 72,
    });
  });

  it('status derivado no backend: prova futura com janela encerrada → future; prova aplicada → past; dentro da janela → open', async () => {
    // Hoje (12/06) está entre o fim das inscrições (31/05) e a prova (12/07).
    let result = await service.getConcursoDetail(CONCURSO.slug);
    expect(result.concurso.status).toBe('future');

    jest.setSystemTime(new Date('2026-07-13T00:00:00.000Z'));
    result = await service.getConcursoDetail(CONCURSO.slug);
    expect(result.concurso.status).toBe('past');

    jest.setSystemTime(new Date('2026-05-15T00:00:00.000Z'));
    result = await service.getConcursoDetail(CONCURSO.slug);
    expect(result.concurso.status).toBe('open');
  });

  it('cargos ordenados por salário desc, null por último; agregados batem', async () => {
    prisma.cargo.findMany.mockResolvedValue([
      buildCargoRow({
        id: 'eb-tecnico',
        role: 'Técnico de Enfermagem',
        salaryBase: '4800',
        vacancyCount: 50,
        hasReserveList: true,
      }),
      buildCargoRow({ id: 'eb-sem-salario', role: 'Auxiliar', salaryBase: null }),
      buildCargoRow(),
    ]);

    const result = await service.getConcursoDetail(CONCURSO.slug);

    expect(result.cargos.map((c) => c.role)).toEqual([
      'Enfermeiro',
      'Técnico de Enfermagem',
      'Auxiliar',
    ]);
    expect(result.concurso.summary).toEqual({
      vacancyTotal: 90,
      hasCR: true,
      salaryMin: '4800',
      salaryMax: '8500',
      registrationFee: '90',
      cargoCount: 3,
    });
  });

  it('cargo irrelevante fica fora (filtro no banco), mas o link self-healing cobre todas as provas', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      buildProva(),
      buildProva({
        id: 'eb-medico',
        isNursingRelevant: false,
        cargoProvas: [{ cargoId: 'eb-medico' }],
      }),
    ]);
    // O banco (where isNursingRelevant: true) já devolve só o Enfermeiro.
    prisma.cargo.findMany.mockResolvedValue([buildCargoRow()]);

    const result = await service.getConcursoDetail(CONCURSO.slug);

    expect(result.cargos.map((c) => c.role)).toEqual(['Enfermeiro']);
    expect(result.concurso.summary.vacancyTotal).toBe(20);
    expect(result.concurso.summary.salaryMax).toBe('8500');
    expect(result.concurso.summary.cargoCount).toBe(1);
    expect(prisma.examBase.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['eb-enfermeiro', 'eb-medico'] },
        concursoId: null,
      },
      data: { concursoId: 'concurso-1' },
    });
  });

  it('prova legada sem linha de Cargo é healada na leitura (rotina do backfill)', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      buildProva({ cargoProvas: [] }),
    ]);

    await service.getConcursoDetail(CONCURSO.slug);

    expect(concursoLink.ensureDefaultCargo).toHaveBeenCalledWith('eb-enfermeiro');
  });

  it('taxas de inscrição divergentes entre cargos → summary.registrationFee null', async () => {
    prisma.cargo.findMany.mockResolvedValue([
      buildCargoRow(),
      buildCargoRow({
        id: 'eb-tecnico',
        role: 'Técnico de Enfermagem',
        registrationFee: '60',
      }),
    ]);

    const result = await service.getConcursoDetail(CONCURSO.slug);

    expect(result.concurso.summary.registrationFee).toBeNull();
  });

  it('cargo sem nenhuma prova publicada fica fora do payload para usuário comum', async () => {
    prisma.cargo.findMany.mockResolvedValue([
      buildCargoRow(),
      {
        ...buildCargoRow({ id: 'eb-oculto', role: 'Enfermeiro Noturno' }),
        provas: [
          {
            isOficial: true,
            examBase: {
              id: 'eb-oculto',
              published: false,
              _count: { questions: 10 },
            },
          },
        ],
      },
    ]);

    const result = await service.getConcursoDetail(CONCURSO.slug);

    expect(result.cargos.map((c) => c.role)).toEqual(['Enfermeiro']);
    expect(result.concurso.summary.cargoCount).toBe(1);
  });
});

describe('ConcursoService.getCargoDetail (página do cargo, MAX-16)', () => {
  const CONCURSO = {
    id: 'concurso-1',
    slug: 'prefeitura-de-campinas-2026-cebraspe',
    institution: 'Prefeitura de Campinas',
    year: 2026,
    governmentScope: GovernmentScope.MUNICIPAL,
    state: 'SP',
    city: 'Campinas',
    editalUrl: 'https://example.com/edital.pdf',
    examBoardId: 'board-1',
    examBoard: {
      id: 'board-1',
      name: 'Cebraspe (Cespe/UnB)',
      alias: 'CEBRASPE',
    },
  };

  let service: ConcursoService;
  let prisma: {
    user: { findUnique: jest.Mock };
    examBase: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    concurso: { findFirst: jest.Mock; update: jest.Mock };
    cargo: { findFirst: jest.Mock };
    examBaseAttempt: { findMany: jest.Mock; groupBy: jest.Mock };
    examBaseAttemptAnswer: { findMany: jest.Mock };
  };
  let concursoLink: { ensureDefaultCargo: jest.Mock };

  /** Linha do model Cargo: ficha + syllabus + vínculos com as provas. */
  function buildCargo(overrides: Record<string, unknown> = {}) {
    const questionCount = (overrides.questionCount as number) ?? 0;
    return {
      id: 'eb-enfermeiro',
      slug: 'pref-campinas-2026-enfermeiro',
      role: 'Enfermeiro',
      description: 'Atuação na rede municipal de saúde',
      requirements: 'Superior em Enfermagem + COREN',
      salaryBase: '8500',
      workload: '40h semanais',
      vacancyCount: 20,
      hasReserveList: false,
      registrationFee: '90',
      minPassingGradeNonQuota: '60',
      syllabusGroups: [
        { name: 'SUS', topics: 'Lei 8.080; Lei 8.142', order: 0 },
      ],
      provas: [
        {
          provaLabel: null,
          isOficial: true,
          examBase: {
            id: 'eb-enfermeiro',
            slug: 'pref-campinas-2026-enfermeiro',
            examDate: new Date('2026-07-12T00:00:00.000Z'),
            editalUrl: null,
            published: true,
            _count: { questions: questionCount },
          },
        },
      ],
      ...overrides,
    };
  }

  function buildSibling(overrides: Record<string, unknown> = {}) {
    return {
      id: 'eb-enfermeiro',
      registrationStart: new Date('2026-05-01T00:00:00.000Z'),
      registrationEnd: new Date('2026-05-31T00:00:00.000Z'),
      examDate: new Date('2026-07-12T00:00:00.000Z'),
      resultDate: null,
      editalUrl: null,
      isNursingRelevant: true,
      ...overrides,
    };
  }

  function buildPreviousExam(overrides: Record<string, unknown> = {}) {
    return {
      id: 'eb-2023',
      slug: 'pref-campinas-2023-enfermeiro',
      examDate: new Date('2023-08-20T00:00:00.000Z'),
      _count: { questions: 80 },
      ...overrides,
    };
  }

  /**
   * findMany do examBase é roteado pelo shape do where:
   * - `where.role` → previousExams (previousEditionsWhere);
   * - `where.OR`   → relacionadas (tier 1/2, com take no banco);
   * - resto (chave do concurso) → siblings (status/timeline).
   */
  function mockExamBaseLists({
    siblings = [buildSibling()],
    previous = [] as Record<string, unknown>[],
    related = [] as Record<string, unknown>[],
  } = {}) {
    prisma.examBase.findMany.mockImplementation(
      (args: { where: { role?: string; OR?: unknown } }) => {
        if (args.where.role) return Promise.resolve(previous);
        if (args.where.OR) return Promise.resolve(related);
        return Promise.resolve(siblings);
      },
    );
  }

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      examBase: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      concurso: {
        findFirst: jest.fn().mockResolvedValue({ ...CONCURSO }),
        update: jest.fn(),
      },
      cargo: { findFirst: jest.fn().mockResolvedValue(buildCargo()) },
      examBaseAttempt: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      examBaseAttemptAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    };
    concursoLink = { ensureDefaultCargo: jest.fn().mockResolvedValue(null) };
    mockExamBaseLists();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConcursoService,
        { provide: ConcursoLinkService, useValue: concursoLink },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ConcursoService);

    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('404 para concurso inexistente', async () => {
    prisma.concurso.findFirst.mockResolvedValue(null);

    await expect(
      service.getCargoDetail('nao-existe', 'qualquer-cargo'),
    ).rejects.toThrow('concurso not found');
  });

  it('404 para cargo que não pertence ao concurso (cargo E prova restritos à chave)', async () => {
    prisma.cargo.findFirst.mockResolvedValue(null);

    await expect(
      service.getCargoDetail(CONCURSO.slug, 'cargo-de-outro-concurso'),
    ).rejects.toThrow('cargo not found');

    // Resolução primária: pelo model Cargo, restrito ao concurso.
    expect(prisma.cargo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'cargo-de-outro-concurso',
          concursoId: CONCURSO.id,
          isNursingRelevant: true,
        }) as object,
      }),
    );
    // Fallback: por prova, restrito à chave do concurso.
    expect(prisma.examBase.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'cargo-de-outro-concurso',
          institution: CONCURSO.institution,
          examBoardId: CONCURSO.examBoardId,
          published: true,
        }) as object,
      }),
    );
  });

  it('cargo aceita UUID além de slug', async () => {
    await service.getCargoDetail(
      CONCURSO.slug,
      '11111111-2222-3333-4444-555555555555',
    );

    expect(prisma.cargo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: '11111111-2222-3333-4444-555555555555',
        }) as object,
      }),
    );
  });

  it('fallback por prova legada: slug de prova sem Cargo é healado e resolve', async () => {
    prisma.cargo.findFirst
      .mockResolvedValueOnce(null) // não há cargo com esse slug
      .mockResolvedValueOnce(buildCargo()); // pós-heal
    prisma.examBase.findFirst.mockResolvedValue({ id: 'eb-enfermeiro' });
    concursoLink.ensureDefaultCargo.mockResolvedValue('eb-enfermeiro');

    const result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro-tipo-2',
    );

    expect(concursoLink.ensureDefaultCargo).toHaveBeenCalledWith('eb-enfermeiro');
    expect(result.cargo.role).toBe('Enfermeiro');
  });

  it('anônimo: ficha completa + studyPlan zerado em diagnostico, sem consultar attempts', async () => {
    const result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
    );

    expect(prisma.examBaseAttempt.findMany).not.toHaveBeenCalled();
    expect(result.cargo).toMatchObject({
      id: 'eb-enfermeiro',
      role: 'Enfermeiro',
      salaryBase: '8500',
      workload: '40h semanais',
      requirements: 'Superior em Enfermagem + COREN',
      vacancyCount: 20,
      registrationFee: '90',
      minPassingGrade: '60',
      questionCount: 0,
    });
    // editalUrl da prova oficial é null → herda o do concurso.
    expect(result.cargo.editalUrl).toBe('https://example.com/edital.pdf');
    expect(result.concurso.status).toBe('future');
    expect(result.studyPlan).toEqual({
      currentStep: 'diagnostico',
      attemptCount: 0,
      bestScore: null,
      scoreDelta: null,
      weakSubjects: [],
    });
  });

  it('prova futura mantém syllabusGroups; prova passada responde []', async () => {
    let result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
    );
    expect(result.syllabusGroups).toEqual([
      { name: 'SUS', topics: 'Lei 8.080; Lei 8.142', order: 0 },
    ]);

    // Depois do dia da prova (12/07) o conteúdo programático some.
    jest.setSystemTime(new Date('2026-07-13T00:00:00.000Z'));
    result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
    );
    expect(result.syllabusGroups).toEqual([]);
  });

  it('previousExams: mesma instituição+banca+role (via Cargo), anos anteriores, com stats do usuário', async () => {
    mockExamBaseLists({ previous: [buildPreviousExam()] });
    prisma.examBaseAttempt.groupBy.mockResolvedValue([
      {
        examBaseId: 'eb-2023',
        _count: { id: 2 },
        _max: { scorePercentage: '65' },
      },
    ]);

    const result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );

    expect(prisma.examBase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institution: CONCURSO.institution,
          examBoardId: CONCURSO.examBoardId,
          role: 'Enfermeiro',
          isNursingRelevant: true,
        }) as object,
      }),
    );
    expect(result.previousExams).toEqual([
      {
        examBaseId: 'eb-2023',
        slug: 'pref-campinas-2023-enfermeiro',
        year: 2023,
        questionCount: 80,
        userStats: { attemptCount: 2, bestScore: 65 },
      },
    ]);
  });

  it('relacionadas: cap no banco (take) nas duas queries de tier', async () => {
    await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );

    const relatedCalls = prisma.examBase.findMany.mock.calls.filter(
      ([args]: [{ where: { OR?: unknown } }]) => args.where.OR != null,
    );
    expect(relatedCalls).toHaveLength(2); // tier 1 (mesma banca) + tier 2
    for (const [args] of relatedCalls) {
      expect(args.take).toBe(8);
    }
    expect(relatedCalls[0][0].where.examBoardId).toBe('board-1');
    expect(relatedCalls[1][0].where.NOT).toEqual({ examBoardId: 'board-1' });
  });

  it('prova futura sem questões: studyPlan computado sobre as previousExams', async () => {
    mockExamBaseLists({ previous: [buildPreviousExam()] });
    prisma.examBaseAttempt.findMany.mockResolvedValue([
      { examBaseId: 'eb-2023', scorePercentage: '50' },
    ]);

    await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );

    expect(prisma.examBaseAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examBaseId: { in: ['eb-2023'] },
        }) as object,
      }),
    );
  });

  it('prova com questões próprias: studyPlan usa a própria prova', async () => {
    prisma.cargo.findFirst.mockResolvedValue(buildCargo({ questionCount: 120 }));
    mockExamBaseLists({ previous: [buildPreviousExam()] });

    await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );

    expect(prisma.examBaseAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examBaseId: { in: ['eb-enfermeiro'] },
        }) as object,
      }),
    );
  });

  it('currentStep: sem tentativa → diagnostico; abaixo do corte → treino_dirigido; no corte → reta_final', async () => {
    prisma.cargo.findFirst.mockResolvedValue(buildCargo({ questionCount: 120 }));
    mockExamBaseLists();

    let result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );
    expect(result.studyPlan.currentStep).toBe('diagnostico');

    prisma.examBaseAttempt.findMany.mockResolvedValue([
      { examBaseId: 'eb-enfermeiro', scorePercentage: '40' },
      { examBaseId: 'eb-enfermeiro', scorePercentage: '55' },
    ]);
    result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );
    expect(result.studyPlan).toMatchObject({
      currentStep: 'treino_dirigido',
      attemptCount: 2,
      bestScore: 55,
      scoreDelta: 15,
    });

    prisma.examBaseAttempt.findMany.mockResolvedValue([
      { examBaseId: 'eb-enfermeiro', scorePercentage: '40' },
      { examBaseId: 'eb-enfermeiro', scorePercentage: '60' },
    ]);
    result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );
    expect(result.studyPlan.currentStep).toBe('reta_final');
  });

  it('weakSubjects: top 3 piores matérias, exigindo mínimo de respostas por matéria', async () => {
    prisma.cargo.findFirst.mockResolvedValue(buildCargo({ questionCount: 120 }));
    mockExamBaseLists();
    prisma.examBaseAttempt.findMany.mockResolvedValue([
      { examBaseId: 'eb-enfermeiro', scorePercentage: '40' },
    ]);

    const answer = (subject: string, correct: boolean) => ({
      selectedAlternative: { key: correct ? 'A' : 'B' },
      examBaseQuestion: { subject, correctAlternative: 'A' },
      examBaseAttempt: { examBaseId: 'eb-enfermeiro' },
    });
    prisma.examBaseAttemptAnswer.findMany.mockResolvedValue([
      // SUS: 5 respondidas, 1 certa → 20%
      ...Array.from({ length: 4 }, () => answer('SUS', false)),
      answer('SUS', true),
      // Farmacologia: 5 respondidas, 3 certas → 60%
      ...Array.from({ length: 3 }, () => answer('Farmacologia', true)),
      ...Array.from({ length: 2 }, () => answer('Farmacologia', false)),
      // Ética: 6 respondidas, 6 certas → 100%
      ...Array.from({ length: 6 }, () => answer('Ética', true)),
      // Pediatria: só 2 respondidas (abaixo do mínimo) → fora da lista
      ...Array.from({ length: 2 }, () => answer('Pediatria', false)),
    ]);

    const result = await service.getCargoDetail(
      CONCURSO.slug,
      'pref-campinas-2026-enfermeiro',
      'user-1',
    );

    expect(result.studyPlan.weakSubjects).toEqual([
      { subject: 'SUS', accuracy: 20 },
      { subject: 'Farmacologia', accuracy: 60 },
      { subject: 'Ética', accuracy: 100 },
    ]);
  });
});
