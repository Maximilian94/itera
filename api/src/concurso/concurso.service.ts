import { Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentScope, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';

/**
 * A "Concurso" (edital) groups one or more "Provas" (ExamBase, one per cargo).
 * The Concurso model exists in the schema but historically every concurso-level
 * fact lived on each ExamBase row. This service wires the relation up for real:
 * it lazily links exam bases to their concurso (find-or-create keyed on the
 * schema's own unique tuple institution+year+examBoardId) the first time the
 * page is viewed, so the data self-populates without a separate migration.
 */
@Injectable()
export class ConcursoService {
  constructor(private readonly prisma: PrismaService) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

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
   * Keyed on institution + year + examBoardId, the model's @@unique tuple.
   * Rows created before slugs existed are healed with one on read.
   */
  private async findOrCreateConcurso(input: {
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
    const slugInput = {
      institution: input.institution,
      year: input.year,
      boardLabel: input.boardLabel,
    };
    const existing = await this.prisma.concurso.findFirst({ where });
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
    } catch {
      // Lost a create race; the row now exists.
      const row = await this.prisma.concurso.findFirst({ where });
      if (row) return row;
      throw new Error('Failed to find or create concurso');
    }
  }

  /**
   * Returns the concurso identity for an exam base plus every sibling prova
   * (cargo) in the same concurso, with the requesting user's stats per prova.
   * When the exam base has no institution there is nothing to group on, so it
   * returns an empty payload and the UI hides the section.
   */
  async getConcursoProvas(examBaseId: string, userId?: string) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const current = await this.prisma.examBase.findFirst({
      where: {
        id: examBaseId,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
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
    if (!current) throw new NotFoundException('exam base not found');

    if (!current.institution) {
      return { concurso: null, provas: [] };
    }

    const year = current.examDate.getFullYear();
    const concurso = await this.findOrCreateConcurso({
      institution: current.institution,
      year,
      governmentScope: current.governmentScope,
      state: current.state,
      city: current.city,
      examBoardId: current.examBoardId,
      boardLabel: current.examBoard?.alias ?? current.examBoard?.name ?? null,
    });

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const provas = await this.prisma.examBase.findMany({
      where: {
        institution: current.institution,
        examBoardId: current.examBoardId,
        examDate: { gte: start, lt: end },
        ...(showUnpublished ? {} : { published: true }),
      },
      orderBy: [{ role: 'asc' }],
      select: {
        id: true,
        role: true,
        slug: true,
        salaryBase: true,
        vacancyCount: true,
        examDate: true,
        examBoardId: true,
        published: true,
        minPassingGradeNonQuota: true,
        editalUrl: true,
        _count: { select: { questions: true } },
      },
    });

    // Self-healing link: attach any matching provas not yet tied to a concurso.
    const unlinkedIds = provas.map((p) => p.id);
    if (unlinkedIds.length > 0) {
      await this.prisma.examBase.updateMany({
        where: { id: { in: unlinkedIds }, concursoId: null },
        data: { concursoId: concurso.id },
      });
    }

    // Self-healing edital URL: promote the earliest prova's editalUrl to the concurso.
    if (!concurso.editalUrl) {
      const withEdital = [...provas]
        .sort((a, b) => a.examDate.getTime() - b.examDate.getTime())
        .find((p) => p.editalUrl);
      if (withEdital?.editalUrl) {
        concurso.editalUrl = withEdital.editalUrl;
        await this.prisma.concurso.update({
          where: { id: concurso.id },
          data: { editalUrl: withEdital.editalUrl },
        });
      }
    }

    // Per-prova stats for the requesting user (finished attempts only).
    const statsByExamBaseId = new Map<
      string,
      { attemptCount: number; bestScore: number | null }
    >();
    if (userId && provas.length > 0) {
      const grouped = await this.prisma.examBaseAttempt.groupBy({
        by: ['examBaseId'],
        where: {
          userId,
          finishedAt: { not: null },
          examBaseId: { in: provas.map((p) => p.id) },
        },
        _count: { id: true },
        _max: { scorePercentage: true },
      });
      for (const s of grouped) {
        const count = (s._count as { id: number } | undefined)?.id ?? 0;
        const maxScore = (s._max as { scorePercentage: unknown } | undefined)
          ?.scorePercentage;
        statsByExamBaseId.set(s.examBaseId, {
          attemptCount: count,
          bestScore: maxScore != null ? Number(maxScore) : null,
        });
      }
    }

    return {
      concurso: {
        id: concurso.id,
        slug: concurso.slug,
        institution: concurso.institution,
        year: concurso.year,
        governmentScope: concurso.governmentScope,
        state: concurso.state,
        city: concurso.city,
        editalUrl: concurso.editalUrl,
      },
      provas: provas.map((p) => ({
        id: p.id,
        role: p.role,
        slug: p.slug,
        salaryBase: p.salaryBase != null ? String(p.salaryBase) : null,
        vacancyCount: p.vacancyCount,
        examDate: p.examDate.toISOString(),
        examBoardId: p.examBoardId,
        published: p.published,
        minPassingGradeNonQuota:
          p.minPassingGradeNonQuota != null
            ? String(p.minPassingGradeNonQuota)
            : null,
        questionCount: p._count.questions,
        isCurrent: p.id === current.id,
        userStats: statsByExamBaseId.get(p.id) ?? {
          attemptCount: 0,
          bestScore: null,
        },
      })),
    };
  }
}
