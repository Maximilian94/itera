import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubjectDistributionService } from './subject-distribution.service';
import { PrismaService } from '../prisma/prisma.service';

const EXAM_BASE_ID = 'eb-1';
const USER_ID = 'user-1';

const PAST_DATE = new Date('2023-06-15T00:00:00.000Z');
const FUTURE_DATE = new Date('2099-06-15T00:00:00.000Z');

function buildExam(overrides: Record<string, unknown> = {}) {
  return {
    id: EXAM_BASE_ID,
    institution: 'Prefeitura de Campinas',
    examBoardId: 'board-1',
    role: 'Enfermeiro',
    examDate: PAST_DATE,
    ...overrides,
  };
}

function group(subject: string | null, count: number) {
  return { subject, _count: { id: count } };
}

/** Uma resposta do usuário: matéria + correta + marcada. */
function answer(subject: string | null, correct: boolean) {
  return {
    selectedAlternative: { key: correct ? 'A' : 'B' },
    examBaseQuestion: { subject, correctAlternative: 'A' },
  };
}

describe('SubjectDistributionService', () => {
  let service: SubjectDistributionService;
  let prisma: {
    user: { findUnique: jest.Mock };
    examBase: { findFirst: jest.Mock; findMany: jest.Mock };
    examBaseQuestion: { groupBy: jest.Mock };
    examBaseAttemptAnswer: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      examBase: {
        findFirst: jest.fn().mockResolvedValue(buildExam()),
        findMany: jest.fn().mockResolvedValue([]),
      },
      examBaseQuestion: { groupBy: jest.fn().mockResolvedValue([]) },
      examBaseAttemptAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubjectDistributionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SubjectDistributionService);
  });

  it('404 quando a prova não existe (ou não está publicada)', async () => {
    prisma.examBase.findFirst.mockResolvedValue(null);
    await expect(
      service.getSubjectDistribution(EXAM_BASE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('prova passada (mode: actual)', () => {
    it('retorna a distribuição real ordenada por count desc, soma = total', async () => {
      prisma.examBaseQuestion.groupBy.mockResolvedValue([
        group('Fundamentos de Enfermagem', 30),
        group('Saúde Coletiva / SUS', 50),
        group('Clínica Médica', 40),
      ]);

      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.mode).toBe('actual');
      expect(result.sourceExams).toEqual([
        { examBaseId: EXAM_BASE_ID, year: 2023 },
      ]);
      expect(result.totalQuestions).toBe(120);
      expect(result.subjects.map((s) => s.subject)).toEqual([
        'Saúde Coletiva / SUS',
        'Clínica Médica',
        'Fundamentos de Enfermagem',
      ]);
      const sum = result.subjects.reduce((acc, s) => acc + s.count, 0);
      expect(sum).toBe(result.totalQuestions);
      expect(result.subjects[0].share).toBeCloseTo(50 / 120);
    });

    it('agrupa por examBaseId in (uma query agregada, sem N+1)', async () => {
      await service.getSubjectDistribution(EXAM_BASE_ID);
      expect(prisma.examBaseQuestion.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.examBaseQuestion.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['subject'],
          where: { examBaseId: { in: [EXAM_BASE_ID] } },
        }),
      );
    });

    it('subject null > 5% do total vira "Outros" e mantém soma = total', async () => {
      prisma.examBaseQuestion.groupBy.mockResolvedValue([
        group('Saúde Coletiva / SUS', 80),
        group(null, 20),
      ]);

      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.totalQuestions).toBe(100);
      expect(result.subjects).toEqual([
        expect.objectContaining({ subject: 'Saúde Coletiva / SUS', count: 80 }),
        expect.objectContaining({ subject: 'Outros', count: 20 }),
      ]);
      const sum = result.subjects.reduce((acc, s) => acc + s.count, 0);
      expect(sum).toBe(result.totalQuestions);
      // "Outros" não entra na leitura do treinador.
      expect(result.insight.topSubjects).toEqual(['Saúde Coletiva / SUS']);
    });

    it('subject null ≤ 5% sai do cálculo (total reduzido, soma preservada)', async () => {
      prisma.examBaseQuestion.groupBy.mockResolvedValue([
        group('Saúde Coletiva / SUS', 98),
        group(null, 2),
      ]);

      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.totalQuestions).toBe(98);
      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0].share).toBeCloseTo(1);
    });
  });

  describe('prova futura (mode: historical)', () => {
    beforeEach(() => {
      prisma.examBase.findFirst.mockResolvedValue(
        buildExam({ examDate: FUTURE_DATE }),
      );
      prisma.examBase.findMany.mockResolvedValue([
        { id: 'eb-2024', examDate: new Date('2024-05-10T00:00:00.000Z') },
        { id: 'eb-2022', examDate: new Date('2022-05-10T00:00:00.000Z') },
      ]);
    });

    it('agrega as edições anteriores e reporta sourceExams', async () => {
      prisma.examBaseQuestion.groupBy.mockResolvedValue([
        group('Saúde Coletiva / SUS', 45),
        group('Clínica Médica', 35),
      ]);

      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.mode).toBe('historical');
      expect(result.sourceExams).toEqual([
        { examBaseId: 'eb-2024', year: 2024 },
        { examBaseId: 'eb-2022', year: 2022 },
      ]);
      expect(prisma.examBase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution: 'Prefeitura de Campinas',
            examBoardId: 'board-1',
            role: 'Enfermeiro',
            isNursingRelevant: true,
            published: true,
          }) as object,
        }),
      );
      expect(prisma.examBaseQuestion.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { examBaseId: { in: ['eb-2024', 'eb-2022'] } },
        }),
      );
      expect(result.totalQuestions).toBe(80);
    });

    it('sem institution não há agrupamento honesto → payload vazio', async () => {
      prisma.examBase.findFirst.mockResolvedValue(
        buildExam({ examDate: FUTURE_DATE, institution: null }),
      );

      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.mode).toBe('historical');
      expect(result.sourceExams).toEqual([]);
      expect(result.totalQuestions).toBe(0);
      expect(result.subjects).toEqual([]);
      expect(prisma.examBase.findMany).not.toHaveBeenCalled();
    });
  });

  describe('userAccuracy + insight', () => {
    beforeEach(() => {
      prisma.examBaseQuestion.groupBy.mockResolvedValue([
        group('Saúde Coletiva / SUS', 50),
        group('Clínica Médica', 40),
        group('Fundamentos de Enfermagem', 30),
      ]);
    });

    it('anônimo: userAccuracy null e insight degrada para só topSubjects', async () => {
      const result = await service.getSubjectDistribution(EXAM_BASE_ID);

      expect(result.subjects.every((s) => s.userAccuracy === null)).toBe(true);
      expect(prisma.examBaseAttemptAnswer.findMany).not.toHaveBeenCalled();
      expect(result.insight.weakestRelevant).toBeNull();
      // 50/120 ≈ 0.42 < 0.5 → precisa da segunda matéria para fechar 50%.
      expect(result.insight.topSubjects).toEqual([
        'Saúde Coletiva / SUS',
        'Clínica Médica',
      ]);
      expect(result.insight.topShare).toBeCloseTo(90 / 120);
    });

    it('calcula acerto por matéria e weakestRelevant = maior share × (1 - acerto)', async () => {
      prisma.examBaseAttemptAnswer.findMany.mockResolvedValue([
        // Saúde Coletiva: 3/6 = 0.50 → prioridade (50/120) × 0.50 ≈ 0.208
        ...Array.from({ length: 3 }, () =>
          answer('Saúde Coletiva / SUS', true),
        ),
        ...Array.from({ length: 3 }, () =>
          answer('Saúde Coletiva / SUS', false),
        ),
        // Clínica Médica: 1/5 = 0.20 → prioridade (40/120) × 0.80 ≈ 0.267 ← pior
        answer('Clínica Médica', true),
        ...Array.from({ length: 4 }, () => answer('Clínica Médica', false)),
        // Fundamentos: só 4 respostas (< 5) → null
        ...Array.from({ length: 4 }, () =>
          answer('Fundamentos de Enfermagem', true),
        ),
      ]);

      const result = await service.getSubjectDistribution(
        EXAM_BASE_ID,
        USER_ID,
      );

      const bySubject = new Map(
        result.subjects.map((s) => [s.subject, s.userAccuracy]),
      );
      expect(bySubject.get('Saúde Coletiva / SUS')).toBeCloseTo(0.5);
      expect(bySubject.get('Clínica Médica')).toBeCloseTo(0.2);
      expect(bySubject.get('Fundamentos de Enfermagem')).toBeNull();
      expect(result.insight.weakestRelevant).toEqual({
        subject: 'Clínica Médica',
        accuracy: 0.2,
      });
    });

    it('só considera tentativas finalizadas das provas-fonte', async () => {
      await service.getSubjectDistribution(EXAM_BASE_ID, USER_ID);

      expect(prisma.examBaseAttemptAnswer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            selectedAlternativeId: { not: null },
            examBaseAttempt: {
              userId: USER_ID,
              finishedAt: { not: null },
              examBaseId: { in: [EXAM_BASE_ID] },
            },
          }) as object,
        }),
      );
    });
  });
});
