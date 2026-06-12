import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamSyllabusGroupService } from './exam-syllabus-group.service';
import { PrismaService } from '../prisma/prisma.service';

const EXAM_BASE_ID = 'eb-1';
const GROUP_ID = 'group-1';

describe('ExamSyllabusGroupService', () => {
  let service: ExamSyllabusGroupService;
  let prisma: {
    examBase: { findUnique: jest.Mock };
    examSyllabusGroup: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      examBase: {
        findUnique: jest.fn().mockResolvedValue({ id: EXAM_BASE_ID }),
      },
      examSyllabusGroup: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: GROUP_ID, ...args.data }),
          ),
        update: jest
          .fn()
          .mockImplementation(
            (args: { where: { id: string }; data: Record<string, unknown> }) =>
              Promise.resolve({ id: args.where.id, ...args.data }),
          ),
        delete: jest.fn().mockResolvedValue({ id: GROUP_ID }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExamSyllabusGroupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ExamSyllabusGroupService);
  });

  describe('list', () => {
    it('returns groups ordered by order asc', async () => {
      const groups = [
        { id: 'g1', order: 0, name: 'SUS', topics: 'Lei 8.080...' },
        { id: 'g2', order: 1, name: 'Saúde da Mulher', topics: 'Pré-natal...' },
      ];
      prisma.examSyllabusGroup.findMany.mockResolvedValue(groups);

      await expect(service.list(EXAM_BASE_ID)).resolves.toEqual(groups);
      expect(prisma.examSyllabusGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { examBaseId: EXAM_BASE_ID },
          orderBy: { order: 'asc' },
        }),
      );
    });

    it('returns empty array for exam without syllabus', async () => {
      await expect(service.list(EXAM_BASE_ID)).resolves.toEqual([]);
    });
  });

  describe('create', () => {
    it('throws NotFound when exam base does not exist', async () => {
      prisma.examBase.findUnique.mockResolvedValue(null);
      await expect(
        service.create(EXAM_BASE_ID, { name: 'SUS', topics: 'Lei 8.080' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('appends to the end when order is omitted', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue({ order: 2 });

      await service.create(EXAM_BASE_ID, { name: 'SUS', topics: 'Lei 8.080' });

      expect(prisma.examSyllabusGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 3 }),
        }),
      );
    });

    it('starts at order 0 when exam has no groups yet', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue(null);

      await service.create(EXAM_BASE_ID, { name: 'SUS', topics: 'Lei 8.080' });

      expect(prisma.examSyllabusGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 0 }),
        }),
      );
    });

    it('respects an explicit order', async () => {
      await service.create(EXAM_BASE_ID, {
        name: 'SUS',
        topics: 'Lei 8.080',
        order: 5,
      });

      expect(prisma.examSyllabusGroup.findFirst).not.toHaveBeenCalled();
      expect(prisma.examSyllabusGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 5 }),
        }),
      );
    });

    it('trims name/topics and rejects blank values', async () => {
      await service.create(EXAM_BASE_ID, {
        name: '  SUS  ',
        topics: '  Lei 8.080  ',
      });
      expect(prisma.examSyllabusGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'SUS', topics: 'Lei 8.080' }),
        }),
      );

      await expect(
        service.create(EXAM_BASE_ID, { name: '   ', topics: 'Lei 8.080' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws NotFound when group does not belong to the exam base', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue(null);
      await expect(
        service.update(EXAM_BASE_ID, GROUP_ID, { name: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.examSyllabusGroup.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: GROUP_ID, examBaseId: EXAM_BASE_ID },
        }),
      );
    });

    it('updates only the provided fields', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue({ id: GROUP_ID });

      await service.update(EXAM_BASE_ID, GROUP_ID, { name: 'Novo nome' });

      expect(prisma.examSyllabusGroup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: GROUP_ID },
          data: expect.objectContaining({
            name: 'Novo nome',
            topics: undefined,
            order: undefined,
          }),
        }),
      );
    });
  });

  describe('reorder', () => {
    const groups = [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }];

    it('rewrites order following the given ids', async () => {
      prisma.examSyllabusGroup.findMany
        .mockResolvedValueOnce(groups) // validação
        .mockResolvedValueOnce([]); // list() final

      await service.reorder(EXAM_BASE_ID, ['g3', 'g1', 'g2']);

      expect(prisma.examSyllabusGroup.update).toHaveBeenCalledWith({
        where: { id: 'g3' },
        data: { order: 0 },
      });
      expect(prisma.examSyllabusGroup.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { order: 1 },
      });
      expect(prisma.examSyllabusGroup.update).toHaveBeenCalledWith({
        where: { id: 'g2' },
        data: { order: 2 },
      });
    });

    it('rejects ids that do not match the existing groups exactly', async () => {
      prisma.examSyllabusGroup.findMany.mockResolvedValue(groups);

      // faltando g3
      await expect(
        service.reorder(EXAM_BASE_ID, ['g1', 'g2']),
      ).rejects.toThrow(BadRequestException);
      // id de outra prova
      await expect(
        service.reorder(EXAM_BASE_ID, ['g1', 'g2', 'outro']),
      ).rejects.toThrow(BadRequestException);
      // duplicado
      await expect(
        service.reorder(EXAM_BASE_ID, ['g1', 'g2', 'g2']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('throws NotFound when group does not belong to the exam base', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue(null);
      await expect(service.remove(EXAM_BASE_ID, GROUP_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.examSyllabusGroup.delete).not.toHaveBeenCalled();
    });

    it('deletes the group', async () => {
      prisma.examSyllabusGroup.findFirst.mockResolvedValue({ id: GROUP_ID });

      await expect(service.remove(EXAM_BASE_ID, GROUP_ID)).resolves.toEqual({
        ok: true,
      });
      expect(prisma.examSyllabusGroup.delete).toHaveBeenCalledWith({
        where: { id: GROUP_ID },
      });
    });
  });
});
