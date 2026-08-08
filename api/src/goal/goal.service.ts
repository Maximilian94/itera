import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Payload de uma meta para a home (Decimal → number, datas → ISO). */
export interface GoalPayload {
  id: string;
  createdAt: string;
  concurso: {
    id: string;
    slug: string | null;
    institution: string;
    year: number;
  };
  cargo: {
    id: string;
    slug: string | null;
    role: string;
    /** Corte do edital (minPassingGradeNonQuota), 0–100. */
    minPassingGrade: number | null;
  };
  /** Data da prova: oficial → primeira prova → concurso.examDate. */
  examDate: string | null;
  /** Provas do cargo — chave de join com as sessões de GET /training. */
  provaExamBaseIds: string[];
  oficialExamBaseId: string | null;
  /** Tentativas finalizadas do usuário nas provas do cargo. */
  stats: { attemptCount: number; bestScore: number | null };
}

type GoalRow = Awaited<ReturnType<GoalService['fetchGoals']>>[number];

/**
 * Metas de estudo ("Treinar para este concurso"). A meta é o vínculo durável
 * usuário↔cargo que ancora a home; as sessões de treino são efêmeras e vivem
 * dentro dela. Ver o comentário do model `UserGoal` no schema.
 */
@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** GET /goals — metas ativas, com backfill lazy a partir dos treinos em andamento. */
  async list(userId: string): Promise<{ goals: GoalPayload[] }> {
    await this.backfillFromTrainings(userId);
    const rows = await this.fetchGoals({ userId, archivedAt: null });
    return { goals: await this.serializeAll(userId, rows) };
  }

  /**
   * POST /goals — cria (ou desarquiva) a meta. `cargoSlug` aceita, na ordem:
   * Cargo.slug, Cargo.id, ExamBase.slug e ExamBase.id (os mesmos fallbacks de
   * identidade da página do cargo).
   */
  async create(
    userId: string,
    dto: CreateGoalDto,
  ): Promise<{ goal: GoalPayload }> {
    const cargoId = await this.resolveCargoId(dto.cargoSlug);
    if (!cargoId) throw new NotFoundException('cargo not found');
    const upserted = await this.prisma.userGoal.upsert({
      where: { userId_cargoId: { userId, cargoId } },
      create: { userId, cargoId },
      update: { archivedAt: null },
      select: { id: true },
    });
    const rows = await this.fetchGoals({ id: upserted.id });
    return { goal: (await this.serializeAll(userId, rows))[0] };
  }

  /** DELETE /goals/:id — "parar de treinar": arquiva (histórico preservado). */
  async archive(userId: string, id: string): Promise<{ ok: true }> {
    const goal = await this.prisma.userGoal.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!goal) throw new NotFoundException('goal not found');
    await this.prisma.userGoal.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * Garante a meta do cargo da prova ao começar um treino (chamado pelo
   * TrainingService). Desarquiva se o usuário tinha parado. Prova sem Cargo
   * vinculado (legado sem lazy-link) → no-op silencioso.
   */
  async ensureForExamBase(userId: string, examBaseId: string): Promise<void> {
    try {
      const link = await this.prisma.cargoProva.findFirst({
        where: { examBaseId },
        select: { cargoId: true },
      });
      if (!link) return;
      await this.prisma.userGoal.upsert({
        where: { userId_cargoId: { userId, cargoId: link.cargoId } },
        create: { userId, cargoId: link.cargoId },
        update: { archivedAt: null },
      });
    } catch (err) {
      // Meta é acessória ao treino — nunca derruba a criação da sessão.
      this.logger.warn(`ensureForExamBase failed: ${String(err)}`);
    }
  }

  /**
   * Migração implícita: treino em andamento sem meta → cria a meta do cargo.
   * Pula cargos que já têm QUALQUER linha (ativa ou arquivada) — arquivar é
   * decisão do usuário e não deve ressuscitar pelo backfill.
   */
  private async backfillFromTrainings(userId: string): Promise<void> {
    const sessions = await this.prisma.trainingSession.findMany({
      where: { userId, currentStage: { not: 'FINAL' } },
      select: { examBaseId: true },
    });
    if (sessions.length === 0) return;
    const links = await this.prisma.cargoProva.findMany({
      where: { examBaseId: { in: [...new Set(sessions.map((s) => s.examBaseId))] } },
      select: { cargoId: true },
    });
    const cargoIds = [...new Set(links.map((l) => l.cargoId))];
    if (cargoIds.length === 0) return;
    const existing = await this.prisma.userGoal.findMany({
      where: { userId, cargoId: { in: cargoIds } },
      select: { cargoId: true },
    });
    const have = new Set(existing.map((e) => e.cargoId));
    const missing = cargoIds.filter((id) => !have.has(id));
    if (missing.length > 0) {
      await this.prisma.userGoal.createMany({
        data: missing.map((cargoId) => ({ userId, cargoId })),
        skipDuplicates: true,
      });
    }
  }

  private fetchGoals(where: {
    id?: string;
    userId?: string;
    archivedAt?: null;
  }) {
    return this.prisma.userGoal.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        cargo: {
          include: {
            concurso: {
              select: {
                id: true,
                slug: true,
                institution: true,
                year: true,
                examDate: true,
              },
            },
            provas: {
              orderBy: [{ isOficial: 'desc' }, { order: 'asc' }],
              select: {
                examBaseId: true,
                isOficial: true,
                examBase: { select: { examDate: true } },
              },
            },
          },
        },
      },
    });
  }

  private async serializeAll(
    userId: string,
    rows: GoalRow[],
  ): Promise<GoalPayload[]> {
    const allProvaIds = [
      ...new Set(rows.flatMap((g) => g.cargo.provas.map((p) => p.examBaseId))),
    ];
    const stats =
      allProvaIds.length === 0
        ? []
        : await this.prisma.examBaseAttempt.groupBy({
            by: ['examBaseId'],
            where: {
              userId,
              examBaseId: { in: allProvaIds },
              finishedAt: { not: null },
            },
            _count: { _all: true },
            _max: { scorePercentage: true },
          });
    const statsByProva = new Map(stats.map((s) => [s.examBaseId, s]));

    return rows.map((g) => {
      const oficial = g.cargo.provas.find((p) => p.isOficial) ?? null;
      const provaStats = g.cargo.provas
        .map((p) => statsByProva.get(p.examBaseId))
        .filter((s) => s != null);
      const bestScores = provaStats
        .map((s) => s._max.scorePercentage)
        .filter((v) => v != null)
        .map(Number);
      const examDate =
        oficial?.examBase.examDate ??
        g.cargo.provas[0]?.examBase.examDate ??
        g.cargo.concurso.examDate ??
        null;
      return {
        id: g.id,
        createdAt: g.createdAt.toISOString(),
        concurso: {
          id: g.cargo.concurso.id,
          slug: g.cargo.concurso.slug,
          institution: g.cargo.concurso.institution,
          year: g.cargo.concurso.year,
        },
        cargo: {
          id: g.cargo.id,
          slug: g.cargo.slug,
          role: g.cargo.role,
          minPassingGrade:
            g.cargo.minPassingGradeNonQuota == null
              ? null
              : Number(g.cargo.minPassingGradeNonQuota),
        },
        examDate: examDate?.toISOString() ?? null,
        provaExamBaseIds: g.cargo.provas.map((p) => p.examBaseId),
        oficialExamBaseId: oficial?.examBaseId ?? null,
        stats: {
          attemptCount: provaStats.reduce((acc, s) => acc + s._count._all, 0),
          bestScore: bestScores.length ? Math.max(...bestScores) : null,
        },
      };
    });
  }

  /** Cargo.slug → Cargo.id → ExamBase.slug → ExamBase.id (via CargoProva). */
  private async resolveCargoId(slugOrId: string): Promise<string | null> {
    const cargo = await this.prisma.cargo.findFirst({
      where: UUID_RE.test(slugOrId)
        ? { OR: [{ id: slugOrId }, { slug: slugOrId }] }
        : { slug: slugOrId },
      select: { id: true },
    });
    if (cargo) return cargo.id;
    const examBase = await this.prisma.examBase.findFirst({
      where: UUID_RE.test(slugOrId)
        ? { OR: [{ id: slugOrId }, { slug: slugOrId }] }
        : { slug: slugOrId },
      select: { cargoProvas: { select: { cargoId: true }, take: 1 } },
    });
    return examBase?.cargoProvas[0]?.cargoId ?? null;
  }
}
