import { Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentScope, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcursoLinkService } from './concurso-link.service';
import {
  aggregateConcursoTimeline,
  deriveConcursoStatus,
  type ConcursoStatus,
} from './concurso-status';
import { matchConcurso, type ConcursoMatch } from './concurso-match';
import { estimateTravelMinutes } from '../geo/city-distance';
import { previousEditionsWhere } from './previous-editions';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Etapa do plano de estudos do usuário para um cargo (regra simples v1):
 * - `diagnostico`     → nenhuma tentativa finalizada nas provas-alvo;
 * - `treino_dirigido` → já tentou, mas o melhor score está abaixo do corte;
 * - `reta_final`      → melhor score atingiu ou superou o corte.
 */
export type StudyPlanStep = 'diagnostico' | 'treino_dirigido' | 'reta_final';

/**
 * Mínimo de questões respondidas por matéria para ela entrar em
 * `weakSubjects` — evita que 0/1 respondida vire "0% de acerto".
 */
const MIN_ANSWERS_PER_SUBJECT = 5;

/** Corte usado quando a prova não define `minPassingGradeNonQuota` (v1). */
const DEFAULT_PASSING_GRADE = 60;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly concursoLink: ConcursoLinkService,
  ) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Self-healing edital URL: promotes the earliest prova's editalUrl to the
   * concurso (mutating the in-memory row too) when the concurso has none.
   */
  private async healEditalUrl(
    concurso: { id: string; editalUrl: string | null },
    provas: { examDate: Date; editalUrl: string | null }[],
  ): Promise<void> {
    if (concurso.editalUrl) return;
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

  /**
   * Per-prova stats for the requesting user (finished attempts only).
   * Anonymous users (or empty prova lists) yield an empty map — callers fall
   * back to zeroed stats.
   */
  private async getUserStatsByExamBase(
    userId: string | undefined,
    examBaseIds: string[],
  ): Promise<Map<string, { attemptCount: number; bestScore: number | null }>> {
    const statsByExamBaseId = new Map<
      string,
      { attemptCount: number; bestScore: number | null }
    >();
    if (!userId || examBaseIds.length === 0) return statsByExamBaseId;

    const grouped = await this.prisma.examBaseAttempt.groupBy({
      by: ['examBaseId'],
      where: {
        userId,
        finishedAt: { not: null },
        examBaseId: { in: examBaseIds },
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
    return statsByExamBaseId;
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

    // UTC como todo o resto da chave de agrupamento (listagem/ranges usam
    // Date.UTC) — getFullYear() no fuso do servidor deslocava provas de
    // 1º/jan para o ano anterior.
    const year = current.examDate.getUTCFullYear();
    const concurso = await this.concursoLink.findOrCreateConcurso({
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
        isNursingRelevant: true,
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

    await this.healEditalUrl(concurso, provas);

    // Product rule (MAX-13): only nursing-relevant cargos surface on the
    // concurso payload and its aggregates. The link/heal above still runs on
    // every sibling so the concurso data stays whole.
    const relevantProvas = provas.filter((p) => p.isNursingRelevant);

    const statsByExamBaseId = await this.getUserStatsByExamBase(
      userId,
      relevantProvas.map((p) => p.id),
    );

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
      provas: relevantProvas.map((p) => ({
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

  /**
   * Discovery listing (MAX-28): one card per concurso, aggregated straight from
   * ExamBase by the grouping tuple (institution + board + exam year) so it
   * covers every concurso whether or not the lazy-link has run yet. Only
   * nursing-relevant provas count (MAX-13); provas without an institution have
   * no grouping key and are left out. Read-only — it never creates concurso
   * rows: cards link by the concurso slug when one already exists, else by a
   * representative ExamBase id (the same lazy fallback the /exams rows use,
   * resolved on first visit by `resolveConcurso`).
   */
  async listConcursos(
    filters: {
      q?: string;
      scope?: GovernmentScope;
      state?: string;
      city?: string;
      examBoardId?: string;
      status?: ConcursoStatus;
    } = {},
    userId?: string,
  ) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const provas = await this.prisma.examBase.findMany({
      where: {
        institution: { not: null },
        isNursingRelevant: true,
        ...(showUnpublished ? {} : { published: true }),
        ...(filters.scope ? { governmentScope: filters.scope } : {}),
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.examBoardId ? { examBoardId: filters.examBoardId } : {}),
      },
      select: {
        id: true,
        institution: true,
        examDate: true,
        governmentScope: true,
        state: true,
        city: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, alias: true } },
        salaryBase: true,
        vacancyCount: true,
        hasReserveList: true,
        registrationStart: true,
        registrationEnd: true,
        resultDate: true,
        cargoGroupId: true,
        isPrimaryProva: true,
        cargoProvas: {
          select: {
            cargoId: true,
            cargo: {
              select: {
                salaryBase: true,
                vacancyCount: true,
                hasReserveList: true,
                isNursingRelevant: true,
              },
            },
          },
        },
        concurso: { select: { id: true, slug: true } },
        _count: { select: { questions: true } },
      },
    });

    // Group by the schema's @@unique tuple (institution + year + board).
    const groups = new Map<string, typeof provas>();
    for (const p of provas) {
      const key = `${p.institution}|${p.examBoardId ?? ''}|${p.examDate.getUTCFullYear()}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(p);
      else groups.set(key, [p]);
    }

    const statsByExamBaseId = await this.getUserStatsByExamBase(
      userId,
      provas.map((p) => p.id),
    );

    const STATUS_ORDER: Record<ConcursoStatus, number> = {
      open: 0,
      future: 1,
      past: 2,
    };

    let items = [...groups.values()].map((bucket) => {
      const head = bucket[0];
      const timeline = aggregateConcursoTimeline(bucket);
      const status = deriveConcursoStatus(timeline);

      // Cargos do concurso (R4.2): a ficha vem do model Cargo via vínculos.
      // Esta listagem é READ-ONLY (não roda o heal), então provas legadas sem
      // vínculo caem no agrupamento antigo (cargoGroupId ?? id, ficha da
      // primária) até alguma leitura de detalhe healá-las.
      interface CargoAgg {
        salaryBase: unknown;
        vacancyCount: number | null;
        hasReserveList: boolean;
        provaIds: string[];
        fichaFromPrimary: boolean;
      }
      const cargoMap = new Map<string, CargoAgg>();
      for (const p of bucket) {
        if (p.cargoProvas.length > 0) {
          for (const link of p.cargoProvas) {
            if (!link.cargo.isNursingRelevant) continue;
            const agg = cargoMap.get(link.cargoId) ?? {
              salaryBase: link.cargo.salaryBase,
              vacancyCount: link.cargo.vacancyCount,
              hasReserveList: link.cargo.hasReserveList,
              provaIds: [],
              fichaFromPrimary: true,
            };
            agg.provaIds.push(p.id);
            cargoMap.set(link.cargoId, agg);
          }
        } else {
          const key = p.cargoGroupId ?? p.id;
          const agg = cargoMap.get(key) ?? {
            salaryBase: p.salaryBase,
            vacancyCount: p.vacancyCount,
            hasReserveList: p.hasReserveList,
            provaIds: [],
            fichaFromPrimary: p.isPrimaryProva,
          };
          agg.provaIds.push(p.id);
          if (p.isPrimaryProva && !agg.fichaFromPrimary) {
            agg.salaryBase = p.salaryBase;
            agg.vacancyCount = p.vacancyCount;
            agg.hasReserveList = p.hasReserveList;
            agg.fichaFromPrimary = true;
          }
          cargoMap.set(key, agg);
        }
      }
      const cargoGroups = [...cargoMap.values()];

      const salaries = cargoGroups
        .map((g) => g.salaryBase)
        .filter((s): s is NonNullable<typeof s> => s != null);

      // Prefer an existing concurso (slug + id); else link by a representative
      // ExamBase id, which `resolveConcurso` turns into a concurso on first view.
      const linked = bucket.find((p) => p.concurso != null)?.concurso ?? null;

      // Aggregate the user's progress across the concurso's relevant provas.
      const stats = bucket
        .map((p) => statsByExamBaseId.get(p.id))
        .filter((s): s is NonNullable<typeof s> => s != null);
      const bestScores = stats
        .map((s) => s.bestScore)
        .filter((s): s is number => s != null);

      return {
        id: linked?.id ?? null,
        slug: linked?.slug ?? head.id,
        institution: head.institution!,
        year: head.examDate.getUTCFullYear(),
        governmentScope: head.governmentScope,
        state: head.state,
        city: head.city,
        examBoard: head.examBoard
          ? {
              id: head.examBoard.id,
              name: head.examBoard.name,
              alias: head.examBoard.alias,
            }
          : null,
        status,
        timeline: {
          registrationStart: timeline.registrationStart?.toISOString() ?? null,
          registrationEnd: timeline.registrationEnd?.toISOString() ?? null,
          examDate: timeline.examDate?.toISOString() ?? null,
          resultDate: timeline.resultDate?.toISOString() ?? null,
        },
        cargoCount: cargoGroups.length,
        vacancyTotal: cargoGroups.reduce(
          (acc, g) => acc + (g.vacancyCount ?? 0),
          0,
        ),
        hasCR: cargoGroups.some((g) => g.hasReserveList),
        salaryMin: salaries.length
          ? String(salaries.reduce((a, b) => (Number(b) < Number(a) ? b : a)))
          : null,
        salaryMax: salaries.length
          ? String(salaries.reduce((a, b) => (Number(b) > Number(a) ? b : a)))
          : null,
        questionCount: bucket.reduce((acc, p) => acc + p._count.questions, 0),
        userStats: {
          attemptedCargos: cargoGroups.filter((g) =>
            g.provaIds.some(
              (id) => (statsByExamBaseId.get(id)?.attemptCount ?? 0) > 0,
            ),
          ).length,
          bestScore: bestScores.length ? Math.max(...bestScores) : null,
        },
      };
    });

    // Concursos ainda sem NENHUMA prova (criados direto do edital pelo fluxo
    // admin do scraper): a agregação acima parte de ExamBase e não os vê, então
    // entram aqui a partir do próprio model — timeline dos campos que o
    // Concurso é dono (janela de inscrição/resultado; sem examDate).
    const provalessConcursos = await this.prisma.concurso.findMany({
      where: {
        examBases: { none: {} },
        cargos: { some: { isNursingRelevant: true } },
        ...(filters.scope ? { governmentScope: filters.scope } : {}),
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.examBoardId ? { examBoardId: filters.examBoardId } : {}),
      },
      select: {
        id: true,
        slug: true,
        institution: true,
        year: true,
        governmentScope: true,
        state: true,
        city: true,
        registrationStart: true,
        registrationEnd: true,
        examDate: true,
        resultDate: true,
        examBoard: { select: { id: true, name: true, alias: true } },
        cargos: {
          where: { isNursingRelevant: true },
          select: {
            salaryBase: true,
            vacancyCount: true,
            hasReserveList: true,
          },
        },
      },
    });
    items = items.concat(
      provalessConcursos.map((c) => {
        const timeline = {
          registrationStart: c.registrationStart,
          registrationEnd: c.registrationEnd,
          examDate: c.examDate,
          resultDate: c.resultDate,
        };
        const salaries = c.cargos
          .map((g) => g.salaryBase)
          .filter((s): s is NonNullable<typeof s> => s != null);
        return {
          id: c.id,
          slug: c.slug ?? c.id,
          institution: c.institution,
          year: c.year,
          governmentScope: c.governmentScope,
          state: c.state,
          city: c.city,
          examBoard: c.examBoard
            ? {
                id: c.examBoard.id,
                name: c.examBoard.name,
                alias: c.examBoard.alias,
              }
            : null,
          status: deriveConcursoStatus(timeline),
          timeline: {
            registrationStart:
              timeline.registrationStart?.toISOString() ?? null,
            registrationEnd: timeline.registrationEnd?.toISOString() ?? null,
            examDate: timeline.examDate?.toISOString() ?? null,
            resultDate: timeline.resultDate?.toISOString() ?? null,
          },
          cargoCount: c.cargos.length,
          vacancyTotal: c.cargos.reduce(
            (acc, g) => acc + (g.vacancyCount ?? 0),
            0,
          ),
          hasCR: c.cargos.some((g) => g.hasReserveList),
          salaryMin: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) < Number(a) ? b : a)))
            : null,
          salaryMax: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) > Number(a) ? b : a)))
            : null,
          questionCount: 0,
          userStats: { attemptedCargos: 0, bestScore: null },
        };
      }),
    );

    // Recommendation annotation (both blocks share the card shape). Anonymous
    // or profile-less users get `match: null` on every card. Travel time is
    // estimated once per distinct city (memoized within the request).
    const preference = userId
      ? await this.prisma.userPreference.findUnique({ where: { userId } })
      : null;
    const travelCache = new Map<string, number | null>();
    const travelTo = (card: { state: string | null; city: string | null }) => {
      const key = `${card.state ?? ''}|${card.city ?? ''}`;
      if (!travelCache.has(key)) {
        travelCache.set(
          key,
          estimateTravelMinutes(
            { state: preference!.state, city: preference!.city },
            card,
          ),
        );
      }
      return travelCache.get(key) ?? null;
    };
    let annotated = items.map((it) => ({
      ...it,
      match: (preference
        ? matchConcurso(preference, it, travelTo(it))
        : null) as ConcursoMatch | null,
    }));

    if (filters.status) {
      annotated = annotated.filter((it) => it.status === filters.status);
    }
    if (filters.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      annotated = annotated.filter(
        (it) =>
          it.institution.toLowerCase().includes(q) ||
          (it.examBoard?.name ?? '').toLowerCase().includes(q) ||
          (it.examBoard?.alias ?? '').toLowerCase().includes(q),
      );
    }

    // Discovery order: actionable first (open → future → past); inside a bucket
    // the most time-relevant exam date leads — soonest upcoming, most recent past.
    annotated.sort((a, b) => {
      if (a.status !== b.status) {
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      const da = a.timeline.examDate ? Date.parse(a.timeline.examDate) : 0;
      const db = b.timeline.examDate ? Date.parse(b.timeline.examDate) : 0;
      return a.status === 'past' ? db - da : da - db;
    });

    return { concursos: annotated };
  }

  /**
   * Entry-point resolution for the concurso pages: matches the slug or UUID
   * against Concurso first; a UUID that matches no concurso is then tried as
   * an ExamBase id, lazily creating/linking that exam base's concurso (same
   * find-or-create as getConcursoProvas). This lets list views link straight
   * to `/concursos/:examBaseId` before any read has healed the link (MAX-25).
   */
  private async resolveConcurso(slugOrId: string, showUnpublished: boolean) {
    const include = {
      examBoard: { select: { id: true, name: true, alias: true } },
    } as const;
    const concurso = await this.prisma.concurso.findFirst({
      where: UUID_RE.test(slugOrId) ? { id: slugOrId } : { slug: slugOrId },
      include,
    });
    if (concurso || !UUID_RE.test(slugOrId)) return concurso;

    const examBase = await this.prisma.examBase.findFirst({
      where: {
        id: slugOrId,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        institution: true,
        examDate: true,
        governmentScope: true,
        state: true,
        city: true,
        examBoardId: true,
        examBoard: { select: { alias: true, name: true } },
      },
    });
    if (!examBase?.institution) return null;

    const created = await this.concursoLink.findOrCreateConcurso({
      institution: examBase.institution,
      year: examBase.examDate.getUTCFullYear(),
      governmentScope: examBase.governmentScope,
      state: examBase.state,
      city: examBase.city,
      examBoardId: examBase.examBoardId,
      boardLabel: examBase.examBoard?.alias ?? examBase.examBoard?.name ?? null,
    });
    return this.prisma.concurso.findFirst({
      where: { id: created.id },
      include,
    });
  }

  /**
   * Canonical payload for the concurso page (nível 1): concurso identity +
   * derived temporal status + timeline + aggregates, plus one card per cargo
   * with the requesting user's stats. Accepts the concurso slug or UUID
   * (an ExamBase UUID also resolves, lazily creating the concurso);
   * works anonymously (stats zeroed). Aggregates and cargos only consider
   * nursing-relevant provas (MAX-13), but the self-healing link still covers
   * every sibling.
   */
  async getConcursoDetail(slugOrId: string, userId?: string) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const concurso = await this.resolveConcurso(slugOrId, showUnpublished);
    if (!concurso) throw new NotFoundException('concurso not found');

    // Same grouping key as getConcursoProvas: institution + board + exam year.
    const start = new Date(Date.UTC(concurso.year, 0, 1));
    const end = new Date(Date.UTC(concurso.year + 1, 0, 1));
    const provas = await this.prisma.examBase.findMany({
      where: {
        institution: concurso.institution,
        examBoardId: concurso.examBoardId,
        examDate: { gte: start, lt: end },
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
        examDate: true,
        registrationStart: true,
        registrationEnd: true,
        resultDate: true,
        editalUrl: true,
        isNursingRelevant: true,
        cargoProvas: { select: { cargoId: true } },
        _count: { select: { questions: true } },
      },
    });

    // Self-healing link: attach any matching provas not yet tied to a concurso.
    if (provas.length > 0) {
      await this.prisma.examBase.updateMany({
        where: { id: { in: provas.map((p) => p.id) }, concursoId: null },
        data: { concursoId: concurso.id },
      });
    }

    await this.healEditalUrl(concurso, provas);

    // Cargo self-heal (R4.2): provas legadas ainda sem linha de Cargo ganham
    // uma (mesma rotina do backfill — respeita grupos legados). Normalmente 0.
    for (const p of provas.filter((x) => x.cargoProvas.length === 0)) {
      await this.concursoLink.ensureDefaultCargo(p.id);
    }

    const relevantProvas = provas.filter((p) => p.isNursingRelevant);
    // Timeline still derives from all siblings when nothing is relevant, so
    // the status stays meaningful for an (edge-case) empty concurso page.
    const timelineSource = relevantProvas.length > 0 ? relevantProvas : provas;
    // Concurso ainda sem prova (criado direto do edital): a timeline vem dos
    // campos que o próprio Concurso é dono — janela de inscrição/resultado/data
    // da prova. Com provas, a data delas tem prioridade; a do concurso preenche
    // a lacuna (nenhuma prova com examDate).
    const aggregated =
      timelineSource.length > 0
        ? aggregateConcursoTimeline(timelineSource)
        : {
            registrationStart: concurso.registrationStart,
            registrationEnd: concurso.registrationEnd,
            examDate: null,
            resultDate: concurso.resultDate,
          };
    const timeline = {
      ...aggregated,
      examDate: aggregated.examDate ?? concurso.examDate,
    };
    const status = deriveConcursoStatus(timeline);

    const statsByExamBaseId = await this.getUserStatsByExamBase(
      userId,
      relevantProvas.map((p) => p.id),
    );

    // Cards de cargo direto do model Cargo (R4.2): ficha da própria linha —
    // não mais da prova primária (o bug "primária despublicada troca a ficha"
    // morre aqui). Prova compartilhada aparece em cada cargo vinculado.
    const cargoRows = await this.prisma.cargo.findMany({
      where: { concursoId: concurso.id, isNursingRelevant: true },
      select: {
        id: true,
        slug: true,
        role: true,
        vacancyCount: true,
        hasReserveList: true,
        salaryBase: true,
        workload: true,
        registrationFee: true,
        minPassingGradeNonQuota: true,
        provas: {
          orderBy: { order: 'asc' as const },
          select: {
            isOficial: true,
            examBase: {
              select: {
                id: true,
                published: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    });
    // Visibilidade como antes: usuário comum só conta provas publicadas;
    // cargo com provas todas invisíveis fica fora do payload. Exceção: cargo
    // SEM nenhum vínculo (concurso criado do edital, prova ainda não
    // cadastrada) aparece com a ficha — `oficial` fica null e o front
    // desabilita o link de treino via provaCount 0.
    const cargoGroups = cargoRows
      .map((c) => ({
        cargo: c,
        links: c.provas.filter((l) => showUnpublished || l.examBase.published),
      }))
      .filter((g) => g.links.length > 0 || g.cargo.provas.length === 0)
      .map((g) => ({
        ...g,
        oficial: g.links.find((l) => l.isOficial) ?? g.links[0] ?? null,
      }));

    // Documentos do concurso → timeline de Notícias (mais recente primeiro).
    // Sem data conhecida cai para o fim, desempatando pela ordem de cadastro.
    const documents = await this.prisma.concursoDocument.findMany({
      where: { concursoId: concurso.id },
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        kind: true,
        publishedAt: true,
        analyzedAt: true,
        changesAppliedAt: true,
      },
    });

    // Cargo cards sorted by salary desc (Enfermeiro before Técnico), nulls last.
    const sortedCargos = [...cargoGroups].sort((a, b) => {
      const sa = a.cargo.salaryBase;
      const sb = b.cargo.salaryBase;
      if (sa == null) return sb == null ? 0 : 1;
      if (sb == null) return -1;
      return Number(sb) - Number(sa);
    });

    // Agregados de cargo (salário/vagas/fee) saem da ficha de cada Cargo.
    const salaries = cargoGroups
      .map((g) => g.cargo.salaryBase)
      .filter((s): s is NonNullable<typeof s> => s != null);
    // A single fee across cargos is the common case; when editions charge
    // different fees per cargo there is no honest single number for the hero,
    // so the summary omits it (the cargo page shows the per-cargo fee).
    const fees = new Set(
      cargoGroups
        .filter((g) => g.cargo.registrationFee != null)
        .map((g) => String(g.cargo.registrationFee)),
    );

    return {
      concurso: {
        id: concurso.id,
        slug: concurso.slug,
        institution: concurso.institution,
        year: concurso.year,
        governmentScope: concurso.governmentScope,
        state: concurso.state,
        city: concurso.city,
        examBoard: concurso.examBoard
          ? {
              id: concurso.examBoard.id,
              name: concurso.examBoard.name,
              alias: concurso.examBoard.alias,
            }
          : null,
        editalUrl: concurso.editalUrl,
        // Página de origem dos documentos → "verificar novas publicações".
        documentsSourceUrl: concurso.documentsSourceUrl,
        documentsCheckedAt: concurso.documentsCheckedAt?.toISOString() ?? null,
        // Etapas do certame (criar-concurso admin); [] quando não preenchidas.
        etapas:
          (concurso.etapas as
            | {
                name: string;
                description: string | null;
                date: string | null;
              }[]
            | null) ?? [],
        status,
        timeline: {
          registrationStart: timeline.registrationStart?.toISOString() ?? null,
          registrationEnd: timeline.registrationEnd?.toISOString() ?? null,
          examDate: timeline.examDate?.toISOString() ?? null,
          resultDate: timeline.resultDate?.toISOString() ?? null,
        },
        summary: {
          vacancyTotal: cargoGroups.reduce(
            (acc, g) => acc + (g.cargo.vacancyCount ?? 0),
            0,
          ),
          hasCR: cargoGroups.some((g) => g.cargo.hasReserveList),
          salaryMin: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) < Number(a) ? b : a)))
            : null,
          salaryMax: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) > Number(a) ? b : a)))
            : null,
          registrationFee: fees.size === 1 ? [...fees][0] : null,
          cargoCount: cargoGroups.length,
        },
      },
      cargos: sortedCargos.map((g) => {
        // Progresso do cargo = agregado das tentativas em todas as suas provas
        // (prova compartilhada conta a MESMA prontidão nos dois cargos).
        const groupStats = g.links
          .map((l) => statsByExamBaseId.get(l.examBase.id))
          .filter((s): s is NonNullable<typeof s> => s != null);
        const bestScores = groupStats
          .map((s) => s.bestScore)
          .filter((s): s is number => s != null);
        return {
          // Contrato: o id do card continua sendo um id de PROVA (a oficial)
          // — deep links e stats do front são examBaseId-keyed. Cargo ainda
          // sem prova cai no id do próprio Cargo (o front não linka:
          // provaCount 0).
          id: g.oficial?.examBase.id ?? g.cargo.id,
          slug: g.cargo.slug,
          role: g.cargo.role,
          vacancyCount: g.cargo.vacancyCount,
          hasReserveList: g.cargo.hasReserveList,
          salaryBase:
            g.cargo.salaryBase != null ? String(g.cargo.salaryBase) : null,
          workload: g.cargo.workload,
          questionCount: g.links.reduce(
            (acc, l) => acc + l.examBase._count.questions,
            0,
          ),
          provaCount: g.links.length,
          minPassingGrade:
            g.cargo.minPassingGradeNonQuota != null
              ? String(g.cargo.minPassingGradeNonQuota)
              : null,
          published: g.oficial?.examBase.published ?? true,
          userStats: {
            attemptCount: groupStats.reduce(
              (acc, s) => acc + s.attemptCount,
              0,
            ),
            bestScore: bestScores.length ? Math.max(...bestScores) : null,
          },
        };
      }),
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        summary: d.summary,
        url: d.url,
        kind: d.kind,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        // Estado da leitura de conteúdo (Fase 2): não analisado → analisado →
        // aplicado. Fica em 'pending' até a análise de PDF existir.
        analyzedAt: d.analyzedAt?.toISOString() ?? null,
        changesAppliedAt: d.changesAppliedAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Planos de estudo do usuário para VÁRIAS provas de uma vez: cada alvo
   * (`id`) deriva seu plano do conjunto `planIds` (a própria prova quando tem
   * questões; as edições anteriores quando é futura). Tentativas e respostas
   * são carregadas em DUAS queries para a união dos ids e os planos derivados
   * em memória. Anônimo ou sem tentativa finalizada → `diagnostico` zerado.
   * `scoreDelta` compara o melhor score com a primeira tentativa;
   * `weakSubjects` são as 3 piores matérias por acurácia (% inteiro), com no
   * mínimo MIN_ANSWERS_PER_SUBJECT questões respondidas.
   */
  private async getStudyPlansBatch(
    userId: string | undefined,
    targets: { id: string; planIds: string[] }[],
    passingGrade: number,
  ): Promise<
    Map<
      string,
      {
        currentStep: StudyPlanStep;
        attemptCount: number;
        bestScore: number | null;
        scoreDelta: number | null;
        weakSubjects: { subject: string; accuracy: number }[];
      }
    >
  > {
    interface Plan {
      currentStep: StudyPlanStep;
      attemptCount: number;
      bestScore: number | null;
      scoreDelta: number | null;
      weakSubjects: { subject: string; accuracy: number }[];
    }
    const empty = (): Plan => ({
      currentStep: 'diagnostico',
      attemptCount: 0,
      bestScore: null,
      scoreDelta: null,
      weakSubjects: [],
    });
    const plans = new Map<string, Plan>();
    const allIds = [...new Set(targets.flatMap((t) => t.planIds))];
    if (!userId || allIds.length === 0) {
      for (const t of targets) plans.set(t.id, empty());
      return plans;
    }

    const attempts = await this.prisma.examBaseAttempt.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        examBaseId: { in: allIds },
      },
      orderBy: { finishedAt: 'asc' },
      select: { examBaseId: true, scorePercentage: true },
    });
    // Acurácia por matéria (ExamBaseQuestion.subject) nas respostas do
    // usuário; só questões efetivamente respondidas (alternativa marcada).
    const answers =
      attempts.length === 0
        ? []
        : await this.prisma.examBaseAttemptAnswer.findMany({
            where: {
              selectedAlternativeId: { not: null },
              examBaseAttempt: {
                userId,
                finishedAt: { not: null },
                examBaseId: { in: allIds },
              },
            },
            select: {
              selectedAlternative: { select: { key: true } },
              examBaseQuestion: {
                select: { subject: true, correctAlternative: true },
              },
              examBaseAttempt: { select: { examBaseId: true } },
            },
          });

    for (const target of targets) {
      const idSet = new Set(target.planIds);
      const targetAttempts = attempts.filter((a) => idSet.has(a.examBaseId));
      if (targetAttempts.length === 0) {
        plans.set(target.id, empty());
        continue;
      }

      const scores = targetAttempts
        .map((a) =>
          a.scorePercentage != null ? Number(a.scorePercentage) : null,
        )
        .filter((s): s is number => s != null);
      const bestScore = scores.length ? Math.max(...scores) : null;
      const firstScore = scores.length ? scores[0] : null;
      const scoreDelta =
        bestScore != null && firstScore != null
          ? Math.round((bestScore - firstScore) * 100) / 100
          : null;
      // Regra simples v1: tentou mas não bateu o corte → treino dirigido;
      // bateu o corte → reta final. Sem score mensurável, continua treinando.
      const currentStep: StudyPlanStep =
        bestScore != null && bestScore >= passingGrade
          ? 'reta_final'
          : 'treino_dirigido';

      const bySubject = new Map<
        string,
        { answered: number; correct: number }
      >();
      for (const a of answers) {
        if (!idSet.has(a.examBaseAttempt.examBaseId)) continue;
        const { subject, correctAlternative } = a.examBaseQuestion;
        if (!subject || !correctAlternative) continue;
        const acc = bySubject.get(subject) ?? { answered: 0, correct: 0 };
        acc.answered += 1;
        if (a.selectedAlternative?.key === correctAlternative) acc.correct += 1;
        bySubject.set(subject, acc);
      }
      const weakSubjects = [...bySubject.entries()]
        .filter(([, s]) => s.answered >= MIN_ANSWERS_PER_SUBJECT)
        .map(([subject, s]) => ({
          subject,
          accuracy: Math.round((s.correct / s.answered) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);

      plans.set(target.id, {
        currentStep,
        attemptCount: targetAttempts.length,
        bestScore,
        scoreDelta,
        weakSubjects,
      });
    }
    return plans;
  }

  /**
   * Payload da página do cargo (nível 2, MAX-16): ficha completa do cargo,
   * conteúdo programático (vazio para prova passada), edições anteriores do
   * mesmo cargo/banca/instituição e o plano de estudos do usuário. O
   * `cargoSlug` é o `ExamBase.slug` (aceita UUID); o cargo precisa pertencer
   * ao concurso do slug e ser nursing-relevant (404 caso contrário, MAX-13).
   * Funciona anonimamente (plano zerado em `diagnostico`).
   */
  async getCargoDetail(
    slugOrId: string,
    cargoSlugOrId: string,
    userId?: string,
  ) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const concurso = await this.prisma.concurso.findFirst({
      where: UUID_RE.test(slugOrId) ? { id: slugOrId } : { slug: slugOrId },
      include: {
        examBoard: { select: { id: true, name: true, alias: true } },
      },
    });
    if (!concurso) throw new NotFoundException('concurso not found');

    // Same grouping key as the nível-1 payload: institution + board + year.
    const start = new Date(Date.UTC(concurso.year, 0, 1));
    const end = new Date(Date.UTC(concurso.year + 1, 0, 1));
    const concursoKey = {
      institution: concurso.institution,
      examBoardId: concurso.examBoardId,
      examDate: { gte: start, lt: end },
    };

    // Remodelagem R4.2: a ficha mora no model Cargo; as provas vêm da join
    // CargoProva (a OFICIAL define identidade/temporais do payload). Resolve
    // primeiro pela própria tabela (slug canônico ou UUID de cargo)…
    const cargoDetailSelect = {
      id: true,
      slug: true,
      role: true,
      description: true,
      requirements: true,
      salaryBase: true,
      workload: true,
      vacancyCount: true,
      hasReserveList: true,
      registrationFee: true,
      minPassingGradeNonQuota: true,
      syllabusGroups: {
        orderBy: { order: 'asc' as const },
        select: {
          name: true,
          topics: true,
          order: true,
          questionCount: true,
          weight: true,
          maxScore: true,
        },
      },
      provas: {
        orderBy: { order: 'asc' as const },
        select: {
          provaLabel: true,
          isOficial: true,
          examBase: {
            select: {
              id: true,
              slug: true,
              examDate: true,
              editalUrl: true,
              published: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
    } as const;
    const cargoWhere = { concursoId: concurso.id, isNursingRelevant: true };

    let cargoRow = await this.prisma.cargo.findFirst({
      where: {
        ...(UUID_RE.test(cargoSlugOrId)
          ? { id: cargoSlugOrId }
          : { slug: cargoSlugOrId }),
        ...cargoWhere,
      },
      select: cargoDetailSelect,
    });

    // …senão por prova (slug/UUID de qualquer prova vinculada — URLs antigas
    // e links diretos por examBaseId), com self-heal para provas legadas
    // ainda sem linha de Cargo (mesma rotina do backfill).
    if (!cargoRow) {
      const requested = await this.prisma.examBase.findFirst({
        where: {
          ...(UUID_RE.test(cargoSlugOrId)
            ? { id: cargoSlugOrId }
            : { slug: cargoSlugOrId }),
          ...concursoKey,
          ...(showUnpublished ? {} : { published: true }),
        },
        select: { id: true },
      });
      if (!requested) throw new NotFoundException('cargo not found');
      const healedId = await this.concursoLink.ensureDefaultCargo(requested.id);
      if (healedId) {
        cargoRow = await this.prisma.cargo.findFirst({
          where: { id: healedId, ...cargoWhere },
          select: cargoDetailSelect,
        });
      }
    }
    if (!cargoRow) throw new NotFoundException('cargo not found');

    // Visibilidade por prova como antes: usuário comum só enxerga provas
    // publicadas; cargo com provas todas invisíveis → 404 (era o 404 da prova
    // não publicada no modelo antigo). Exceção: cargo SEM NENHUM vínculo
    // (concurso criado direto do edital) tem página — ficha + edições
    // anteriores + provas relacionadas para estudar; a prova entra depois.
    const visibleLinks = cargoRow.provas.filter(
      (l) => showUnpublished || l.examBase.published,
    );
    if (visibleLinks.length === 0 && cargoRow.provas.length > 0)
      throw new NotFoundException('cargo not found');
    // A oficial representa o cargo no payload (id/examDate/published) — o
    // contrato mantém cargo.id como um id de PROVA (o front consome
    // /exam-bases/:id/subject-distribution e /competition-history com ele).
    // Cargo sem prova cai no id do próprio Cargo (o front não chama esses
    // endpoints quando `provas` vem vazio) e examDate null.
    const oficial =
      visibleLinks.find((l) => l.isOficial) ?? visibleLinks[0] ?? null;
    const cargo = {
      ...cargoRow,
      id: oficial?.examBase.id ?? cargoRow.id,
      examDate: oficial?.examBase.examDate ?? null,
      editalUrl: oficial?.examBase.editalUrl ?? null,
      published: oficial?.examBase.published ?? true,
      _count: oficial?.examBase._count ?? { questions: 0 },
    };

    // Status do concurso agregado dos siblings, como no nível 1; a leitura
    // também aproveita para rodar o self-healing link/edital.
    const siblings = await this.prisma.examBase.findMany({
      where: {
        ...concursoKey,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
        registrationStart: true,
        registrationEnd: true,
        examDate: true,
        resultDate: true,
        editalUrl: true,
        isNursingRelevant: true,
      },
    });
    if (siblings.length > 0) {
      await this.prisma.examBase.updateMany({
        where: { id: { in: siblings.map((p) => p.id) }, concursoId: null },
        data: { concursoId: concurso.id },
      });
    }
    await this.healEditalUrl(concurso, siblings);

    const relevantSiblings = siblings.filter((p) => p.isNursingRelevant);
    const timeline = aggregateConcursoTimeline(
      relevantSiblings.length > 0 ? relevantSiblings : siblings,
    );
    const status = deriveConcursoStatus(timeline);

    // Edições anteriores do mesmo cargo (helper comum com MAX-17/MAX-18).
    // Alimentam o treino quando a prova é futura. O role vem do CARGO (R4.2).
    const previousExams = await this.prisma.examBase.findMany({
      where: previousEditionsWhere({
        institution: concurso.institution,
        examBoardId: concurso.examBoardId,
        role: cargo.role,
        examYear: concurso.year,
        showUnpublished,
      }),
      orderBy: { examDate: 'desc' },
      select: {
        id: true,
        slug: true,
        examDate: true,
        _count: { select: { questions: true } },
      },
    });

    // Provas recomendadas para treinar: mesmo cargo (role, resolvido via
    // Cargo — o OR na coluna legada cobre provas ainda não healadas) com
    // questões, fora deste cargo. tier 1 = mesma banca; tier 2 = outra banca.
    // O cap desce ao banco: 2 queries com take (era fetch-all + sort).
    const RELATED_LIMIT = 8;
    const ownGroupIds = cargoRow.provas.map((l) => l.examBase.id);
    const relatedSelect = {
      id: true,
      slug: true,
      institution: true,
      examDate: true,
      examBoardId: true,
      examBoard: { select: { alias: true, name: true } },
      _count: { select: { questions: true } },
    } as const;
    const relatedBaseWhere = {
      OR: [
        { cargoProvas: { some: { cargo: { role: cargo.role } } } },
        { role: cargo.role },
      ],
      isNursingRelevant: true,
      ...(showUnpublished ? {} : { published: true }),
      questions: { some: {} },
      id: { notIn: ownGroupIds },
    };
    const [tier1, tier2] = await Promise.all([
      this.prisma.examBase.findMany({
        where: { ...relatedBaseWhere, examBoardId: concurso.examBoardId },
        orderBy: [{ examDate: 'desc' }, { id: 'asc' }],
        take: RELATED_LIMIT,
        select: relatedSelect,
      }),
      this.prisma.examBase.findMany({
        where: {
          ...relatedBaseWhere,
          NOT: { examBoardId: concurso.examBoardId },
        },
        orderBy: [{ examDate: 'desc' }, { id: 'asc' }],
        take: RELATED_LIMIT,
        select: relatedSelect,
      }),
    ]);
    const related = [
      ...tier1.map((p) => ({ ...p, tier: 1 })),
      ...tier2.map((p) => ({ ...p, tier: 2 })),
    ].slice(0, RELATED_LIMIT);

    // Stats do usuário: UM groupBy para provas do cargo + relacionadas +
    // edições anteriores (era 3 queries — absorvido do antigo T1.5).
    const statsById = await this.getUserStatsByExamBase(userId, [
      ...new Set([
        ...visibleLinks.map((l) => l.examBase.id),
        ...related.map((p) => p.id),
        ...previousExams.map((p) => p.id),
      ]),
    ]);
    const previousStats = statsById;
    const provasStats = statsById;
    const relatedStats = statsById;

    // Corte é cargo-level (da ficha do Cargo). Um plano de estudos POR prova:
    // prova com questões → plano sobre ela; sem questões (futura) → sobre as
    // edições anteriores do cargo. As respostas do usuário são carregadas UMA
    // vez para o conjunto inteiro e os planos derivados em memória (era ~2
    // queries por prova — absorvido do antigo T1.5).
    const passingGrade =
      cargo.minPassingGradeNonQuota != null
        ? Number(cargo.minPassingGradeNonQuota)
        : DEFAULT_PASSING_GRADE;
    const previousIds = previousExams.map((pe) => pe.id);
    const planTargets = [
      ...visibleLinks.map((l) => ({
        id: l.examBase.id,
        planIds:
          l.examBase._count.questions > 0 ? [l.examBase.id] : previousIds,
      })),
      // Cargo sem prova: o plano top-level computa sobre as edições
      // anteriores (mesma regra da prova futura sem questões).
      ...(visibleLinks.length === 0
        ? [{ id: cargo.id, planIds: previousIds }]
        : []),
      // Relacionadas sempre têm questões → plano sobre elas mesmas.
      ...related.map((p) => ({ id: p.id, planIds: [p.id] })),
    ];
    const planByProva = await this.getStudyPlansBatch(
      userId,
      planTargets,
      passingGrade,
    );
    // Plano top-level = o da prova oficial (cargo de prova única usa só este).
    const studyPlan = planByProva.get(cargo.id)!;

    // Conteúdo programático só faz sentido para prova ainda não aplicada;
    // para prova passada a página foca nas provas anteriores e no treino.
    // Sem prova (examDate null) o cargo é "futuro" por definição.
    const cargoIsPast =
      cargo.examDate != null &&
      deriveConcursoStatus({
        registrationStart: null,
        registrationEnd: null,
        examDate: cargo.examDate,
      }) === 'past';

    return {
      concurso: {
        id: concurso.id,
        slug: concurso.slug,
        institution: concurso.institution,
        year: concurso.year,
        status,
        examBoard: concurso.examBoard
          ? {
              id: concurso.examBoard.id,
              name: concurso.examBoard.name,
              alias: concurso.examBoard.alias,
            }
          : null,
        examDate: timeline.examDate?.toISOString() ?? null,
      },
      cargo: {
        id: cargo.id,
        slug: cargo.slug,
        role: cargo.role,
        description: cargo.description,
        requirements: cargo.requirements,
        salaryBase: cargo.salaryBase != null ? String(cargo.salaryBase) : null,
        workload: cargo.workload,
        vacancyCount: cargo.vacancyCount,
        hasReserveList: cargo.hasReserveList,
        registrationFee:
          cargo.registrationFee != null ? String(cargo.registrationFee) : null,
        minPassingGrade:
          cargo.minPassingGradeNonQuota != null
            ? String(cargo.minPassingGradeNonQuota)
            : null,
        questionCount: cargo._count.questions,
        examDate: cargo.examDate?.toISOString() ?? null,
        editalUrl: cargo.editalUrl ?? concurso.editalUrl,
        published: cargo.published,
      },
      syllabusGroups: cargoIsPast
        ? []
        : cargo.syllabusGroups.map((g) => ({
            name: g.name,
            topics: g.topics,
            order: g.order,
            questionCount: g.questionCount,
            weight: g.weight != null ? String(g.weight) : null,
            maxScore: g.maxScore != null ? String(g.maxScore) : null,
          })),
      // Provas do cargo (vínculos CargoProva). Oficial primeiro, depois pela
      // ordem do vínculo. `isPrimary` deriva de `isOficial` (contrato externo
      // inalterado). Cargo de 1 prova → array de 1.
      provas: [...visibleLinks]
        .sort((a, b) => {
          if (a.isOficial !== b.isOficial) return a.isOficial ? -1 : 1;
          return (a.provaLabel ?? '').localeCompare(b.provaLabel ?? '');
        })
        .map((l) => ({
          examBaseId: l.examBase.id,
          slug: l.examBase.slug,
          label: l.provaLabel,
          isPrimary: l.isOficial,
          examDate: l.examBase.examDate.toISOString(),
          questionCount: l.examBase._count.questions,
          userStats: provasStats.get(l.examBase.id) ?? {
            attemptCount: 0,
            bestScore: null,
          },
          studyPlan: planByProva.get(l.examBase.id)!,
        })),
      // Provas recomendadas para treinar (mesmo cargo). tier 1 = mesma banca,
      // tier 2 = outra banca. Cada uma com seu plano (treina nela mesma).
      relatedProvas: related.map((p) => ({
        examBaseId: p.id,
        slug: p.slug,
        institution: p.institution,
        year: p.examDate.getUTCFullYear(),
        examBoardId: p.examBoardId,
        examBoardAlias: p.examBoard?.alias ?? p.examBoard?.name ?? null,
        tier: p.tier,
        questionCount: p._count.questions,
        userStats: relatedStats.get(p.id) ?? {
          attemptCount: 0,
          bestScore: null,
        },
        studyPlan: planByProva.get(p.id)!,
      })),
      previousExams: previousExams.map((p) => ({
        examBaseId: p.id,
        slug: p.slug,
        year: p.examDate.getUTCFullYear(),
        questionCount: p._count.questions,
        userStats: previousStats.get(p.id) ?? {
          attemptCount: 0,
          bestScore: null,
        },
      })),
      studyPlan,
    };
  }
}
