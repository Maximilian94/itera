import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { CargoService } from './cargo.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoLinkService } from '../concurso/concurso-link.service';

const CARGO_ID = 'cargo-1';
const PROVA_A = 'eb-a';
const PROVA_B = 'eb-b';

describe('CargoService (invariantes da remodelagem, R4.1)', () => {
  let service: CargoService;
  let prisma: {
    $transaction: jest.Mock;
    cargo: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cargoProva: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    examBase: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    concurso: { findUnique: jest.Mock };
  };
  let concursoLink: {
    ensureConcursoForExamBase: jest.Mock;
    ensureDefaultCargo: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      // Cobre as duas formas: array de promises e callback interativo (tx = o
      // próprio mock — suficiente para verificar a sequência de escritas).
      $transaction: jest.fn(
        async (arg: unknown[] | ((tx: unknown) => Promise<unknown>)) =>
          Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
      ),
      cargo: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cargoProva: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: null } }),
      },
      examBase: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      concurso: { findUnique: jest.fn() },
    };
    concursoLink = {
      ensureConcursoForExamBase: jest.fn().mockResolvedValue(null),
      ensureDefaultCargo: jest.fn().mockResolvedValue(null),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CargoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConcursoLinkService, useValue: concursoLink },
      ],
    }).compile();

    service = moduleRef.get(CargoService);
    // getOne() é chamado no fim das mutações para devolver o payload.
    jest
      .spyOn(service, 'getOne')
      .mockResolvedValue({ id: CARGO_ID } as never);
  });

  describe('linkProva', () => {
    beforeEach(() => {
      prisma.cargo.findUnique.mockResolvedValue({
        id: CARGO_ID,
        concursoId: 'concurso-1',
        _count: { provas: 1 },
      });
      prisma.examBase.findUnique.mockResolvedValue({
        id: PROVA_B,
        concursoId: 'concurso-1',
      });
    });

    it('prova de OUTRO concurso → 400 (compartilhar só dentro do mesmo edital)', async () => {
      prisma.examBase.findUnique.mockResolvedValue({
        id: PROVA_B,
        concursoId: 'concurso-2',
      });

      await expect(service.linkProva(CARGO_ID, PROVA_B)).rejects.toThrow(
        /mesmo concurso/,
      );
      expect(prisma.cargoProva.create).not.toHaveBeenCalled();
    });

    it('prova órfã ganha concurso eagerly; se ainda divergir → 400', async () => {
      prisma.examBase.findUnique.mockResolvedValue({
        id: PROVA_B,
        concursoId: null,
      });
      concursoLink.ensureConcursoForExamBase.mockResolvedValue('concurso-2');

      await expect(service.linkProva(CARGO_ID, PROVA_B)).rejects.toThrow(
        /mesmo concurso/,
      );
      expect(concursoLink.ensureConcursoForExamBase).toHaveBeenCalledWith(PROVA_B);
    });

    it('vincular como oficial rebaixa a atual NA MESMA transação', async () => {
      await service.linkProva(CARGO_ID, PROVA_B, { isOficial: true });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.cargoProva.updateMany).toHaveBeenCalledWith({
        where: { cargoId: CARGO_ID, isOficial: true },
        data: { isOficial: false },
      });
      expect(prisma.cargoProva.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cargoId: CARGO_ID,
          examBaseId: PROVA_B,
          isOficial: true,
        }) as object,
      });
      // Dual-write legado: a prova entra no grupo do cargo como primária.
      expect(prisma.examBase.update).toHaveBeenCalledWith({
        where: { id: PROVA_B },
        data: expect.objectContaining({
          cargoGroupId: CARGO_ID,
          isPrimaryProva: true,
        }) as object,
      });
    });

    it('primeira prova do cargo vira oficial por default', async () => {
      prisma.cargo.findUnique.mockResolvedValue({
        id: CARGO_ID,
        concursoId: 'concurso-1',
        _count: { provas: 0 },
      });

      await service.linkProva(CARGO_ID, PROVA_A);

      expect(prisma.cargoProva.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isOficial: true }) as object,
      });
    });
  });

  describe('unlinkProva', () => {
    it('desvincular a prova OFICIAL → 400 exigindo eleger outra antes', async () => {
      prisma.cargoProva.findUnique.mockResolvedValue({
        id: 'link-1',
        isOficial: true,
      });

      await expect(service.unlinkProva(CARGO_ID, PROVA_A)).rejects.toThrow(
        /marque outra prova como oficial/,
      );
      expect(prisma.cargoProva.delete).not.toHaveBeenCalled();
    });

    it('prova não-oficial desvincula e volta ao formato standalone no legado', async () => {
      prisma.cargoProva.findUnique.mockResolvedValue({
        id: 'link-2',
        isOficial: false,
      });

      await service.unlinkProva(CARGO_ID, PROVA_B);

      expect(prisma.cargoProva.delete).toHaveBeenCalledWith({
        where: { id: 'link-2' },
      });
      expect(prisma.examBase.update).toHaveBeenCalledWith({
        where: { id: PROVA_B },
        data: { cargoGroupId: null, provaLabel: null, isPrimaryProva: true },
      });
    });
  });

  describe('setOficial', () => {
    it('rebaixa a atual e promove a nova em $transaction, com espelho legado', async () => {
      prisma.cargoProva.findUnique.mockResolvedValue({
        id: 'link-b',
        isOficial: false,
      });
      prisma.cargoProva.findMany.mockResolvedValue([
        { examBaseId: PROVA_A },
        { examBaseId: PROVA_B },
      ]);

      await service.setOficial(CARGO_ID, PROVA_B);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.cargoProva.updateMany).toHaveBeenCalledWith({
        where: { cargoId: CARGO_ID, isOficial: true },
        data: { isOficial: false },
      });
      expect(prisma.cargoProva.update).toHaveBeenCalledWith({
        where: { id: 'link-b' },
        data: { isOficial: true },
      });
      // Legado: isPrimaryProva acompanha nos siblings do cargo.
      expect(prisma.examBase.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [PROVA_A, PROVA_B] } },
        data: { isPrimaryProva: false },
      });
      expect(prisma.examBase.update).toHaveBeenCalledWith({
        where: { id: PROVA_B },
        data: { isPrimaryProva: true },
      });
    });

    it('já é a oficial → no-op (sem transação)', async () => {
      prisma.cargoProva.findUnique.mockResolvedValue({
        id: 'link-a',
        isOficial: true,
      });

      await service.setOficial(CARGO_ID, PROVA_A);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('update (ficha)', () => {
    it('dual-write: espelha a ficha nas colunas legadas da prova oficial', async () => {
      prisma.cargo.findUnique.mockResolvedValue({
        id: CARGO_ID,
        provas: [{ examBaseId: PROVA_A }],
      });
      prisma.cargo.update.mockResolvedValue({ id: CARGO_ID });
      prisma.examBase.update.mockResolvedValue({});

      await service.update(CARGO_ID, { salaryBase: '9000.00', role: 'Enfermeiro' });

      expect(prisma.cargo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CARGO_ID },
          data: expect.objectContaining({
            salaryBase: '9000.00',
            role: 'Enfermeiro',
          }) as object,
        }),
      );
      expect(prisma.examBase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROVA_A },
          data: expect.objectContaining({ salaryBase: '9000.00' }) as object,
        }),
      );
    });
  });

  describe('ensureDefaultCargo', () => {
    it('delega para o ConcursoLinkService (implementação compartilhada com o self-heal de leitura)', async () => {
      concursoLink.ensureDefaultCargo.mockResolvedValue('cargo-x');

      const result = await service.ensureDefaultCargo(PROVA_A);

      expect(result).toBe('cargo-x');
      expect(concursoLink.ensureDefaultCargo).toHaveBeenCalledWith(PROVA_A);
    });
  });
});
