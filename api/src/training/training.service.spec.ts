import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrainingService } from './training.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExamBaseAttemptService } from '../examBaseAttempt/exam-base-attempt.service';
import { AnalyticsService } from '../analytics/analytics.service';

const USER_ID = 'user-1';
const EXAM_BASE_ID = 'eb-1';

describe('TrainingService.create (idempotência por prova, T2.1)', () => {
  let service: TrainingService;
  let prisma: {
    user: { findUnique: jest.Mock };
    subscription: { findFirst: jest.Mock };
    trainingSession: {
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    examBase: { findUnique: jest.Mock };
    examBaseAttempt: { create: jest.Mock };
  };
  let analytics: { capture: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'USER' }) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      trainingSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'session-new' }),
      },
      examBase: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: EXAM_BASE_ID, examBoardId: 'board-1' }),
      },
      examBaseAttempt: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'attempt-new', examBaseId: EXAM_BASE_ID }),
      },
    };
    analytics = { capture: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ExamBaseAttemptService, useValue: {} },
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compile();

    service = moduleRef.get(TrainingService);
  });

  it('sem sessão ativa: cria attempt + sessão (onboarding grátis)', async () => {
    const result = await service.create(EXAM_BASE_ID, USER_ID);

    expect(prisma.trainingSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER_ID,
          examBaseId: EXAM_BASE_ID,
          currentStage: { not: 'FINAL' },
        },
      }),
    );
    expect(prisma.trainingSession.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      trainingId: 'session-new',
      attemptId: 'attempt-new',
      examBaseId: EXAM_BASE_ID,
      examBoardId: 'board-1',
    });
  });

  it('sessão EM ANDAMENTO na mesma prova: retorna a existente sem criar nem cobrar cota', async () => {
    prisma.trainingSession.findFirst.mockResolvedValue({
      id: 'session-active',
      examBaseAttemptId: 'attempt-active',
      examBaseId: EXAM_BASE_ID,
      examBase: { examBoardId: 'board-1' },
    });

    const result = await service.create(EXAM_BASE_ID, USER_ID);

    expect(result).toEqual({
      trainingId: 'session-active',
      attemptId: 'attempt-active',
      examBaseId: EXAM_BASE_ID,
      examBoardId: 'board-1',
    });
    // Nada de cota: nem enforcement de plano, nem novas linhas.
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.trainingSession.count).not.toHaveBeenCalled();
    expect(prisma.examBaseAttempt.create).not.toHaveBeenCalled();
    expect(prisma.trainingSession.create).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('sessão anterior FINALizada não bloqueia um novo ciclo', async () => {
    // O filtro currentStage != FINAL fica no banco; o mock devolve null como
    // o Postgres devolveria para uma sessão concluída.
    prisma.trainingSession.findFirst.mockResolvedValue(null);

    const result = await service.create(EXAM_BASE_ID, USER_ID);

    expect(result.trainingId).toBe('session-new');
    expect(prisma.trainingSession.create).toHaveBeenCalledTimes(1);
  });

  it('cota esgotada continua bloqueando quando NÃO há sessão ativa', async () => {
    prisma.trainingSession.count.mockResolvedValue(1); // já usou o treino grátis

    await expect(service.create(EXAM_BASE_ID, USER_ID)).rejects.toThrow(
      /assinatura ativa/,
    );
    expect(prisma.trainingSession.create).not.toHaveBeenCalled();
  });
});
