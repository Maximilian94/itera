import { Test } from '@nestjs/testing';
import {
  CareerStage,
  ExamHorizon,
  PreferenceMobility,
} from '@prisma/client';
import { PreferenceService } from './preference.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PreferenceService', () => {
  let service: PreferenceService;
  const prisma = {
    userPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const row = {
    id: 'pref-1',
    userId: 'user-1',
    state: 'SP',
    city: 'Campinas',
    mobility: PreferenceMobility.MAX_1H,
    careerStage: CareerStage.COREN_REGISTERED,
    minSalary: '3500.00',
    horizon: ExamHorizon.ASAP,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-02T00:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PreferenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PreferenceService);
  });

  it('get returns null when the user has no preference yet', async () => {
    prisma.userPreference.findUnique.mockResolvedValue(null);
    await expect(service.get('user-1')).resolves.toEqual({ preference: null });
  });

  it('get serializes minSalary as string and updatedAt as ISO', async () => {
    prisma.userPreference.findUnique.mockResolvedValue(row);
    const result = await service.get('user-1');
    expect(result.preference).toMatchObject({
      state: 'SP',
      city: 'Campinas',
      minSalary: '3500.00',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
  });

  it('upsert creates/updates keyed by userId, normalizing state and city', async () => {
    prisma.userPreference.upsert.mockResolvedValue(row);
    await service.upsert('user-1', {
      state: 'sp',
      city: '  Campinas ',
      mobility: PreferenceMobility.MAX_1H,
      careerStage: CareerStage.COREN_REGISTERED,
      minSalary: 3500,
      horizon: ExamHorizon.ASAP,
    });
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: expect.objectContaining({
        userId: 'user-1',
        state: 'SP',
        city: 'Campinas',
        minSalary: 3500,
      }),
      update: expect.objectContaining({ state: 'SP', city: 'Campinas' }),
    });
  });

  it('upsert clears minSalary when absent', async () => {
    prisma.userPreference.upsert.mockResolvedValue({ ...row, minSalary: null });
    const result = await service.upsert('user-1', {
      state: 'SP',
      city: 'Campinas',
      mobility: PreferenceMobility.MAX_1H,
      careerStage: CareerStage.STUDENT,
      horizon: ExamHorizon.LONG_TERM,
    });
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ minSalary: null }),
      }),
    );
    expect(result.preference.minSalary).toBeNull();
  });

  it('STATE scope keeps the UF but drops the city (whole-state anchor)', async () => {
    prisma.userPreference.upsert.mockResolvedValue({
      ...row,
      city: null,
      mobility: PreferenceMobility.STATE,
    });
    await service.upsert('user-1', {
      state: 'sp',
      city: 'Campinas', // enviado por engano — o escopo estado ignora
      mobility: PreferenceMobility.STATE,
      careerStage: CareerStage.COREN_REGISTERED,
      horizon: ExamHorizon.ASAP,
    });
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ state: 'SP', city: null }),
      }),
    );
  });

  it('ANYWHERE scope drops the whole anchor (state and city null)', async () => {
    prisma.userPreference.upsert.mockResolvedValue({
      ...row,
      state: null,
      city: null,
      mobility: PreferenceMobility.ANYWHERE,
    });
    await service.upsert('user-1', {
      mobility: PreferenceMobility.ANYWHERE,
      careerStage: CareerStage.STUDENT,
      horizon: ExamHorizon.LONG_TERM,
    });
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ state: null, city: null }),
      }),
    );
  });
});
