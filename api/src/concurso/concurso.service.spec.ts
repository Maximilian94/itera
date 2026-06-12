import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { GovernmentScope } from '@prisma/client';
import { ConcursoService } from './concurso.service';
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
