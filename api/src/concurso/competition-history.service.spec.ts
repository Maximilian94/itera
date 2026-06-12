import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetitionHistoryService } from './competition-history.service';
import { PrismaService } from '../prisma/prisma.service';

const EXAM_BASE_ID = 'eb-1';

function buildExam(overrides: Record<string, unknown> = {}) {
  return {
    id: EXAM_BASE_ID,
    institution: 'Prefeitura de Campinas',
    examBoardId: 'board-1',
    role: 'Enfermeiro',
    examDate: new Date('2026-06-15T00:00:00.000Z'),
    ...overrides,
  };
}

function edition(
  year: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: `eb-${year}`,
    examDate: new Date(Date.UTC(year, 4, 10)),
    applicantCount: null,
    vacancyCount: null,
    minPassingGradeNonQuota: null,
    actualCutScore: null,
    ...overrides,
  };
}

describe('CompetitionHistoryService', () => {
  let service: CompetitionHistoryService;
  let prisma: {
    user: { findUnique: jest.Mock };
    examBase: { findFirst: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      examBase: {
        findFirst: jest.fn().mockResolvedValue(buildExam()),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CompetitionHistoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CompetitionHistoryService);
  });

  it('404 quando a prova não existe (ou não está publicada)', async () => {
    prisma.examBase.findFirst.mockResolvedValue(null);
    await expect(
      service.getCompetitionHistory(EXAM_BASE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sem edições anteriores → editions: [] (não 404)', async () => {
    const result = await service.getCompetitionHistory(EXAM_BASE_ID);
    expect(result).toEqual({ editions: [] });
  });

  it('sem institution não há match honesto → [] sem consultar edições', async () => {
    prisma.examBase.findFirst.mockResolvedValue(
      buildExam({ institution: null }),
    );
    const result = await service.getCompetitionHistory(EXAM_BASE_ID);
    expect(result).toEqual({ editions: [] });
    expect(prisma.examBase.findMany).not.toHaveBeenCalled();
  });

  it('match das edições: institution + banca + role, antes do ano da prova, publicadas', async () => {
    await service.getCompetitionHistory(EXAM_BASE_ID);
    expect(prisma.examBase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          institution: 'Prefeitura de Campinas',
          examBoardId: 'board-1',
          role: 'Enfermeiro',
          examDate: { lt: new Date(Date.UTC(2026, 0, 1)) },
          isNursingRelevant: true,
          published: true,
        },
        orderBy: { examDate: 'desc' },
      }),
    );
  });

  it('mapeia ano, inscritos, candidatos/vaga arredondado e notas', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      edition(2024, {
        applicantCount: 1786,
        vacancyCount: 20,
        minPassingGradeNonQuota: '60.00',
        actualCutScore: '74.50',
      }),
      edition(2022, {
        applicantCount: 943,
        vacancyCount: 12,
        minPassingGradeNonQuota: '55.00',
      }),
    ]);

    const result = await service.getCompetitionHistory(EXAM_BASE_ID);

    expect(result.editions).toEqual([
      {
        examBaseId: 'eb-2024',
        year: 2024,
        applicantCount: 1786,
        vacancyCount: 20,
        perVacancy: 89, // 1786 / 20 = 89.3 → 89
        minPassingGrade: '60.00',
        actualCutScore: '74.50',
      },
      {
        examBaseId: 'eb-2022',
        year: 2022,
        applicantCount: 943,
        vacancyCount: 12,
        perVacancy: 79, // 943 / 12 ≈ 78.58 → 79
        minPassingGrade: '55.00',
        actualCutScore: null,
      },
    ]);
  });

  it('campos nulos tratados: inscritos sem vagas → perVacancy null; corte sem inscritos entra', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      // Tem inscritos mas não tem vagas nem nota.
      edition(2024, { applicantCount: 500 }),
      // Não tem inscritos mas tem a nota mínima — ainda diz algo.
      edition(2022, { vacancyCount: 10, minPassingGradeNonQuota: '50.00' }),
    ]);

    const result = await service.getCompetitionHistory(EXAM_BASE_ID);

    expect(result.editions).toEqual([
      expect.objectContaining({
        year: 2024,
        applicantCount: 500,
        vacancyCount: null,
        perVacancy: null,
        minPassingGrade: null,
        actualCutScore: null,
      }),
      expect.objectContaining({
        year: 2022,
        applicantCount: null,
        perVacancy: null,
        minPassingGrade: '50.00',
      }),
    ]);
  });

  it('edição sem inscritos E sem nota alguma fica fora da lista', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      edition(2024, { applicantCount: 1200, vacancyCount: 15 }),
      // Só tem vagas — nada de concorrência → excluída.
      edition(2020, { vacancyCount: 8 }),
    ]);

    const result = await service.getCompetitionHistory(EXAM_BASE_ID);

    expect(result.editions).toHaveLength(1);
    expect(result.editions[0].year).toBe(2024);
  });

  it('vacancyCount 0 não divide: perVacancy null', async () => {
    prisma.examBase.findMany.mockResolvedValue([
      edition(2024, { applicantCount: 300, vacancyCount: 0 }),
    ]);

    const result = await service.getCompetitionHistory(EXAM_BASE_ID);

    expect(result.editions[0].perVacancy).toBeNull();
  });
});
