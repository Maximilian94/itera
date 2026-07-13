import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoLinkService } from '../concurso/concurso-link.service';

function normalizeOptionalText(v: string | null | undefined) {
  const t = typeof v === 'string' ? v.trim() : v;
  return t === '' ? null : (t ?? null);
}

/** Ficha da vaga editável pelo admin (espelho do model Cargo). */
type CargoFichaInput = {
  role?: string;
  slug?: string | null;
  description?: string | null;
  requirements?: string | null;
  salaryBase?: string | null;
  workload?: string | null;
  vacancyCount?: number | null;
  hasReserveList?: boolean;
  applicantCount?: number | null;
  registrationFee?: string | null;
  minPassingGradeNonQuota?: string | null;
  actualCutScore?: string | null;
  isNursingRelevant?: boolean;
};

const CARGO_SELECT = {
  id: true,
  slug: true,
  role: true,
  description: true,
  requirements: true,
  salaryBase: true,
  workload: true,
  vacancyCount: true,
  hasReserveList: true,
  applicantCount: true,
  registrationFee: true,
  minPassingGradeNonQuota: true,
  actualCutScore: true,
  isNursingRelevant: true,
  concursoId: true,
  provas: {
    orderBy: { order: 'asc' as const },
    select: {
      examBaseId: true,
      provaLabel: true,
      isOficial: true,
      order: true,
      examBase: {
        select: {
          id: true,
          name: true,
          slug: true,
          examDate: true,
          published: true,
          examBoard: { select: { id: true, alias: true, name: true } },
          _count: { select: { questions: true } },
        },
      },
    },
  },
} satisfies Prisma.CargoSelect;

/**
 * Serviço ADMIN da remodelagem Cargo↔Prova (R4.1): CRUD da ficha da vaga,
 * vínculos M:N com provas e os invariantes que o modelo antigo
 * (cargoGroupId/isPrimaryProva) não tinha:
 *
 * - ≤1 prova oficial por cargo — trocado em $transaction (rebaixa a atual,
 *   promove a nova); o unique parcial `cargo_provas_one_oficial_per_cargo`
 *   pega qualquer corrida;
 * - prova compartilhada só entre cargos do MESMO concurso;
 * - desvincular a prova oficial exige eleger outra antes (explícito > mágico).
 *
 * Dual-write (até R6.1): as colunas legadas da prova (cargoGroupId,
 * provaLabel, isPrimaryProva e as de ficha) continuam sendo escritas para
 * manter rollback trivial. Prova compartilhada por N cargos não é
 * representável no modelo antigo — o espelho aponta para o último vínculo.
 */
@Injectable()
export class CargoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly concursoLink: ConcursoLinkService,
  ) {}

  private fichaData(input: CargoFichaInput) {
    return {
      role: input.role,
      slug: input.slug === undefined ? undefined : normalizeOptionalText(input.slug),
      description:
        input.description === undefined
          ? undefined
          : normalizeOptionalText(input.description),
      requirements:
        input.requirements === undefined
          ? undefined
          : normalizeOptionalText(input.requirements),
      salaryBase: input.salaryBase === undefined ? undefined : input.salaryBase,
      workload:
        input.workload === undefined ? undefined : normalizeOptionalText(input.workload),
      vacancyCount: input.vacancyCount === undefined ? undefined : input.vacancyCount,
      hasReserveList: input.hasReserveList,
      applicantCount:
        input.applicantCount === undefined ? undefined : input.applicantCount,
      registrationFee:
        input.registrationFee === undefined ? undefined : input.registrationFee,
      minPassingGradeNonQuota:
        input.minPassingGradeNonQuota === undefined
          ? undefined
          : input.minPassingGradeNonQuota,
      actualCutScore:
        input.actualCutScore === undefined ? undefined : input.actualCutScore,
      isNursingRelevant: input.isNursingRelevant,
    };
  }

  /** Colunas legadas de ficha na prova (dual-write até R6.1). */
  private legacyFichaData(input: CargoFichaInput) {
    return {
      role: input.role,
      description:
        input.description === undefined
          ? undefined
          : normalizeOptionalText(input.description),
      requirements:
        input.requirements === undefined
          ? undefined
          : normalizeOptionalText(input.requirements),
      salaryBase: input.salaryBase === undefined ? undefined : input.salaryBase,
      workload:
        input.workload === undefined ? undefined : normalizeOptionalText(input.workload),
      vacancyCount: input.vacancyCount === undefined ? undefined : input.vacancyCount,
      hasReserveList: input.hasReserveList,
      applicantCount:
        input.applicantCount === undefined ? undefined : input.applicantCount,
      registrationFee:
        input.registrationFee === undefined ? undefined : input.registrationFee,
      minPassingGradeNonQuota:
        input.minPassingGradeNonQuota === undefined
          ? undefined
          : input.minPassingGradeNonQuota,
      actualCutScore:
        input.actualCutScore === undefined ? undefined : input.actualCutScore,
      isNursingRelevant: input.isNursingRelevant,
    };
  }

  list(filters: { concursoId?: string }) {
    return this.prisma.cargo.findMany({
      where: filters.concursoId ? { concursoId: filters.concursoId } : undefined,
      orderBy: [{ role: 'asc' }],
      select: CARGO_SELECT,
    });
  }

  async getOne(cargoId: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: CARGO_SELECT,
    });
    if (!cargo) throw new NotFoundException('cargo not found');
    return cargo;
  }

  async create(input: CargoFichaInput & { concursoId: string; role: string }) {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id: input.concursoId },
      select: { id: true },
    });
    if (!concurso) throw new NotFoundException('concurso not found');

    return this.prisma.cargo.create({
      data: {
        ...this.fichaData(input),
        role: input.role,
        concursoId: input.concursoId,
      },
      select: CARGO_SELECT,
    });
  }

  async update(cargoId: string, input: CargoFichaInput) {
    const exists = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: {
        id: true,
        provas: { where: { isOficial: true }, select: { examBaseId: true } },
      },
    });
    if (!exists) throw new NotFoundException('cargo not found');

    const oficialId = exists.provas[0]?.examBaseId;
    const [cargo] = await this.prisma.$transaction([
      this.prisma.cargo.update({
        where: { id: cargoId },
        data: this.fichaData(input),
        select: CARGO_SELECT,
      }),
      // Dual-write: espelha a ficha nas colunas legadas da prova oficial.
      ...(oficialId
        ? [
            this.prisma.examBase.update({
              where: { id: oficialId },
              data: this.legacyFichaData(input),
            }),
          ]
        : []),
    ]);
    return cargo;
  }

  async remove(cargoId: string) {
    const exists = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: { id: true, provas: { select: { examBaseId: true } } },
    });
    if (!exists) throw new NotFoundException('cargo not found');

    await this.prisma.$transaction([
      // Espelho legado: as provas voltam ao formato standalone.
      this.prisma.examBase.updateMany({
        where: { id: { in: exists.provas.map((p) => p.examBaseId) } },
        data: { cargoGroupId: null, provaLabel: null, isPrimaryProva: true },
      }),
      this.prisma.cargo.delete({ where: { id: cargoId } }), // cascade nos vínculos
    ]);
    return { ok: true };
  }

  /**
   * Vincula uma prova ao cargo. Prova compartilhada só entre cargos do MESMO
   * concurso; prova ainda sem concurso ganha um eagerly (find-or-create) se
   * tiver institution.
   */
  async linkProva(
    cargoId: string,
    examBaseId: string,
    input: { provaLabel?: string | null; isOficial?: boolean } = {},
  ) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      select: { id: true, concursoId: true, _count: { select: { provas: true } } },
    });
    if (!cargo) throw new NotFoundException('cargo not found');

    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true, concursoId: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const provaConcursoId =
      examBase.concursoId ??
      (await this.concursoLink.ensureConcursoForExamBase(examBaseId));
    if (provaConcursoId !== cargo.concursoId) {
      throw new BadRequestException(
        'a prova pertence a outro concurso — compartilhar prova só é permitido entre cargos do mesmo concurso',
      );
    }

    const isOficial = input.isOficial ?? cargo._count.provas === 0;
    const provaLabel = normalizeOptionalText(input.provaLabel);
    try {
      await this.prisma.$transaction(async (tx) => {
        if (isOficial) {
          await tx.cargoProva.updateMany({
            where: { cargoId, isOficial: true },
            data: { isOficial: false },
          });
        }
        const last = await tx.cargoProva.aggregate({
          where: { cargoId },
          _max: { order: true },
        });
        await tx.cargoProva.create({
          data: {
            cargoId,
            examBaseId,
            provaLabel,
            isOficial,
            order: (last._max.order ?? -1) + 1,
          },
        });
        // Dual-write legado: a prova entra no "grupo" do cargo.
        await tx.examBase.update({
          where: { id: examBaseId },
          data: { cargoGroupId: cargoId, provaLabel, isPrimaryProva: isOficial },
        });
        if (isOficial) {
          await tx.examBase.updateMany({
            where: { cargoGroupId: cargoId, id: { not: examBaseId } },
            data: { isPrimaryProva: false },
          });
        }
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('a prova já está vinculada a este cargo');
      }
      throw err;
    }
    return this.getOne(cargoId);
  }

  /** Edita rótulo/ordem de um vínculo existente. */
  async updateProvaLink(
    cargoId: string,
    examBaseId: string,
    input: { provaLabel?: string | null; order?: number },
  ) {
    const link = await this.prisma.cargoProva.findUnique({
      where: { cargoId_examBaseId: { cargoId, examBaseId } },
      select: { id: true },
    });
    if (!link) throw new NotFoundException('vínculo não encontrado');

    const provaLabel =
      input.provaLabel === undefined
        ? undefined
        : normalizeOptionalText(input.provaLabel);
    await this.prisma.$transaction([
      this.prisma.cargoProva.update({
        where: { id: link.id },
        data: { provaLabel, order: input.order },
      }),
      // Dual-write legado do rótulo.
      ...(provaLabel !== undefined
        ? [
            this.prisma.examBase.update({
              where: { id: examBaseId },
              data: { provaLabel },
            }),
          ]
        : []),
    ]);
    return this.getOne(cargoId);
  }

  /**
   * Desvincula uma prova. A oficial não pode ser desvinculada — eleja outra
   * antes (400): explícito > promoção automática silenciosa.
   */
  async unlinkProva(cargoId: string, examBaseId: string) {
    const link = await this.prisma.cargoProva.findUnique({
      where: { cargoId_examBaseId: { cargoId, examBaseId } },
      select: { id: true, isOficial: true },
    });
    if (!link) throw new NotFoundException('vínculo não encontrado');
    if (link.isOficial) {
      throw new BadRequestException(
        'esta é a prova oficial do cargo — marque outra prova como oficial antes de desvincular',
      );
    }

    await this.prisma.$transaction([
      this.prisma.cargoProva.delete({ where: { id: link.id } }),
      // Espelho legado: a prova volta ao formato standalone.
      this.prisma.examBase.update({
        where: { id: examBaseId },
        data: { cargoGroupId: null, provaLabel: null, isPrimaryProva: true },
      }),
    ]);
    return this.getOne(cargoId);
  }

  /**
   * Elege a prova oficial do cargo em transação: rebaixa a atual e promove a
   * nova (o unique parcial no banco pega qualquer corrida). A ficha do cargo
   * NÃO muda — ela mora no Cargo (o bug "primária despublicada troca a ficha"
   * morreu na remodelagem).
   */
  async setOficial(cargoId: string, examBaseId: string) {
    const link = await this.prisma.cargoProva.findUnique({
      where: { cargoId_examBaseId: { cargoId, examBaseId } },
      select: { id: true, isOficial: true },
    });
    if (!link) throw new NotFoundException('vínculo não encontrado');
    if (link.isOficial) return this.getOne(cargoId);

    await this.prisma.$transaction(async (tx) => {
      await tx.cargoProva.updateMany({
        where: { cargoId, isOficial: true },
        data: { isOficial: false },
      });
      await tx.cargoProva.update({
        where: { id: link.id },
        data: { isOficial: true },
      });
      // Dual-write legado: isPrimaryProva acompanha (siblings do cargo).
      const siblings = await tx.cargoProva.findMany({
        where: { cargoId },
        select: { examBaseId: true },
      });
      await tx.examBase.updateMany({
        where: { id: { in: siblings.map((s) => s.examBaseId) } },
        data: { isPrimaryProva: false },
      });
      await tx.examBase.update({
        where: { id: examBaseId },
        data: { isPrimaryProva: true },
      });
    });
    return this.getOne(cargoId);
  }

  /**
   * Cargo default 1:1 para uma prova (R4.1 item 4): o caso comum "1 prova =
   * 1 cargo" continua sem passo extra no wizard. A implementação mora no
   * ConcursoLinkService (o self-heal de leitura do R4.2 usa a mesma rotina
   * sem criar ciclo de módulos); aqui fica a porta usada pelos hooks de
   * escrita (wizard admin e promoção do scraper).
   */
  ensureDefaultCargo(examBaseId: string): Promise<string | null> {
    return this.concursoLink.ensureDefaultCargo(examBaseId);
  }
}
