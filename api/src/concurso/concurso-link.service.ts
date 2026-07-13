import { Injectable } from '@nestjs/common';
import { GovernmentScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';

/**
 * Find-or-create do Concurso (o "lazy-link"), extraído do ConcursoService
 * para ser compartilhado: além das leituras self-healing das páginas de
 * concurso, a remodelagem Cargo↔Prova (R3.1) exige o Concurso EAGER na
 * criação/edição da prova — `Cargo.concursoId` é obrigatório.
 */
@Injectable()
export class ConcursoLinkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds the concurso slug (institution + year + board, e.g.
   * "prefeitura-campinas-2026-cebraspe"), appending a numeric suffix when the
   * natural slug is already taken by another concurso.
   */
  private async generateUniqueSlug(input: {
    institution: string;
    year: number;
    boardLabel: string | null;
  }): Promise<string> {
    const base = [
      slugify(input.institution),
      String(input.year),
      input.boardLabel ? slugify(input.boardLabel) : null,
    ]
      .filter(Boolean)
      .join('-');
    let candidate = base;
    for (let suffix = 2; ; suffix++) {
      const clash = await this.prisma.concurso.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
      candidate = `${base}-${suffix}`;
    }
  }

  /**
   * Finds (or creates) the Concurso row matching an exam base's identity.
   * Keyed on institution + year + examBoardId, the model's @@unique tuple
   * (complementado por um índice único parcial para examBoardId NULL, onde
   * o @@unique do Postgres não protege — NULLs são distintos).
   * Rows created before slugs existed are healed with one on read.
   */
  async findOrCreateConcurso(input: {
    institution: string;
    year: number;
    governmentScope: GovernmentScope;
    state: string | null;
    city: string | null;
    examBoardId: string | null;
    boardLabel: string | null;
  }) {
    const where = {
      institution: input.institution,
      year: input.year,
      examBoardId: input.examBoardId,
    };
    // Determinístico caso duplicatas pré-índice ainda existam: o sobrevivente
    // eleito pela migration de dedup é sempre o mais antigo.
    const orderBy = { createdAt: 'asc' } as const;
    const slugInput = {
      institution: input.institution,
      year: input.year,
      boardLabel: input.boardLabel,
    };
    const existing = await this.prisma.concurso.findFirst({ where, orderBy });
    if (existing) {
      if (existing.slug) return existing;
      return this.prisma.concurso.update({
        where: { id: existing.id },
        data: { slug: await this.generateUniqueSlug(slugInput) },
      });
    }
    try {
      return await this.prisma.concurso.create({
        data: {
          slug: await this.generateUniqueSlug(slugInput),
          institution: input.institution,
          year: input.year,
          governmentScope: input.governmentScope,
          state: input.state,
          city: input.city,
          examBoardId: input.examBoardId,
        },
      });
    } catch (err) {
      // Só a corrida de create (unique violada → a linha agora existe) é
      // recuperável; qualquer outro erro propaga com a causa original.
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
      const row = await this.prisma.concurso.findFirst({ where, orderBy });
      if (row) return row;
      throw new Error('Failed to find or create concurso', { cause: err });
    }
  }

  /**
   * Cargo self-heal (R4.2): garante a linha `Cargo` + vínculos de uma prova,
   * espelhando o backfill da migration — provas legadas (criadas fora dos
   * hooks de escrita: seeds, factories, dados pré-remodelagem) ganham o cargo
   * na primeira leitura. Respeita o `cargoGroupId` legado: grupo → 1 Cargo
   * (id = cargoGroupId, ficha do representante, TODAS as provas do grupo
   * vinculadas); standalone → cargo 1:1 (id = id da prova).
   * Retorna o cargoId, ou null quando a prova não tem institution.
   */
  async ensureDefaultCargo(examBaseId: string): Promise<string | null> {
    const existing = await this.prisma.cargoProva.findFirst({
      where: { examBaseId },
      select: { cargoId: true },
    });
    if (existing) return existing.cargoId;

    const concursoId = await this.ensureConcursoForExamBase(examBaseId);
    if (!concursoId) return null;

    const prova = await this.prisma.examBase.findUniqueOrThrow({
      where: { id: examBaseId },
      select: { id: true, cargoGroupId: true },
    });

    // Membros do cargo: o grupo legado inteiro, ou só a própria prova.
    const members = prova.cargoGroupId
      ? await this.prisma.examBase.findMany({
          where: { cargoGroupId: prova.cargoGroupId },
          orderBy: [
            { isPrimaryProva: 'desc' },
            { examDate: 'asc' },
            { id: 'asc' },
          ],
          select: {
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
            provaLabel: true,
            concursoId: true,
          },
        })
      : await this.prisma.examBase.findMany({
          where: { id: examBaseId },
          select: {
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
            provaLabel: true,
            concursoId: true,
          },
        });
    const rep = members[0];
    const cargoId = prova.cargoGroupId ?? prova.id;

    const create = (slug: string | null) =>
      this.prisma.$transaction(async (tx) => {
        await tx.cargo.create({
          data: {
            id: cargoId,
            slug,
            role: rep.role,
            description: rep.description,
            requirements: rep.requirements,
            salaryBase: rep.salaryBase,
            workload: rep.workload,
            vacancyCount: rep.vacancyCount,
            hasReserveList: rep.hasReserveList,
            applicantCount: rep.applicantCount,
            registrationFee: rep.registrationFee,
            minPassingGradeNonQuota: rep.minPassingGradeNonQuota,
            actualCutScore: rep.actualCutScore,
            isNursingRelevant: rep.isNursingRelevant,
            concursoId,
          },
        });
        await tx.cargoProva.createMany({
          data: members.map((m, i) => ({
            cargoId,
            examBaseId: m.id,
            provaLabel: m.provaLabel,
            isOficial: m.id === rep.id,
            order: i,
          })),
          skipDuplicates: true,
        });
        // Membros do grupo em outro concurso não deveriam existir; garante o
        // vínculo de concurso dos que ainda não têm.
        await tx.examBase.updateMany({
          where: { id: { in: members.map((m) => m.id) }, concursoId: null },
          data: { concursoId },
        });
        // Como no backfill: o conteúdo programático da prova oficial passa a
        // pertencer ao cargo (linhas legadas criadas só com examBaseId).
        await tx.examSyllabusGroup.updateMany({
          where: { examBaseId: rep.id, cargoId: null },
          data: { cargoId },
        });
      });

    try {
      await create(rep.slug);
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
      // Corrida (cargo criado em paralelo) → devolve o existente; clash de
      // slug/id com outro cargo → tenta sem slug (heal depois).
      const raced = await this.prisma.cargoProva.findFirst({
        where: { examBaseId },
        select: { cargoId: true },
      });
      if (raced) return raced.cargoId;
      await create(null);
    }
    return cargoId;
  }

  /**
   * Garante o Concurso de uma prova e popula `concursoId` (versão eager do
   * lazy-link, usada na criação/edição da prova pelo wizard admin). Prova sem
   * `institution` não tem chave de agrupamento → retorna null (ela fica fora
   * das páginas de concurso e sem Cargo default, comportamento atual).
   */
  async ensureConcursoForExamBase(examBaseId: string): Promise<string | null> {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: {
        institution: true,
        examDate: true,
        governmentScope: true,
        state: true,
        city: true,
        examBoardId: true,
        examBoard: { select: { alias: true, name: true } },
        concursoId: true,
      },
    });
    if (!examBase?.institution) return null;
    if (examBase.concursoId) return examBase.concursoId;

    const concurso = await this.findOrCreateConcurso({
      institution: examBase.institution,
      // UTC como toda a chave de agrupamento (T1.2).
      year: examBase.examDate.getUTCFullYear(),
      governmentScope: examBase.governmentScope,
      state: examBase.state,
      city: examBase.city,
      examBoardId: examBase.examBoardId,
      boardLabel: examBase.examBoard?.alias ?? examBase.examBoard?.name ?? null,
    });
    await this.prisma.examBase.update({
      where: { id: examBaseId },
      data: { concursoId: concurso.id },
    });
    return concurso.id;
  }
}
