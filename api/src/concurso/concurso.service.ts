import { Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentScope, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slugify';
import {
  aggregateConcursoTimeline,
  deriveConcursoStatus,
} from './concurso-status';
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
   * Canonical payload for the concurso page (nível 1): concurso identity +
   * derived temporal status + timeline + aggregates, plus one card per cargo
   * with the requesting user's stats. Accepts the concurso slug or UUID;
   * works anonymously (stats zeroed). Aggregates and cargos only consider
   * nursing-relevant provas (MAX-13), but the self-healing link still covers
   * every sibling.
   */
  async getConcursoDetail(slugOrId: string, userId?: string) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const concurso = await this.prisma.concurso.findFirst({
      where: UUID_RE.test(slugOrId) ? { id: slugOrId } : { slug: slugOrId },
      include: {
        examBoard: { select: { id: true, name: true, alias: true } },
      },
    });
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
        slug: true,
        role: true,
        vacancyCount: true,
        hasReserveList: true,
        salaryBase: true,
        workload: true,
        registrationFee: true,
        minPassingGradeNonQuota: true,
        examDate: true,
        registrationStart: true,
        registrationEnd: true,
        resultDate: true,
        published: true,
        editalUrl: true,
        isNursingRelevant: true,
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

    const relevantProvas = provas.filter((p) => p.isNursingRelevant);
    // Timeline still derives from all siblings when nothing is relevant, so
    // the status stays meaningful for an (edge-case) empty concurso page.
    const timelineSource = relevantProvas.length > 0 ? relevantProvas : provas;
    const timeline = aggregateConcursoTimeline(timelineSource);
    const status = deriveConcursoStatus(timeline);

    const statsByExamBaseId = await this.getUserStatsByExamBase(
      userId,
      relevantProvas.map((p) => p.id),
    );

    // Cargo cards sorted by salary desc (Enfermeiro before Técnico), nulls last.
    const cargos = [...relevantProvas].sort((a, b) => {
      if (a.salaryBase == null) return b.salaryBase == null ? 0 : 1;
      if (b.salaryBase == null) return -1;
      return Number(b.salaryBase) - Number(a.salaryBase);
    });

    const salaries = relevantProvas
      .map((p) => p.salaryBase)
      .filter((s): s is NonNullable<typeof s> => s != null);
    // A single fee across cargos is the common case; when editions charge
    // different fees per cargo there is no honest single number for the hero,
    // so the summary omits it (the cargo page shows the per-cargo fee).
    const fees = new Set(
      relevantProvas
        .filter((p) => p.registrationFee != null)
        .map((p) => String(p.registrationFee)),
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
        status,
        timeline: {
          registrationStart: timeline.registrationStart?.toISOString() ?? null,
          registrationEnd: timeline.registrationEnd?.toISOString() ?? null,
          examDate: timeline.examDate?.toISOString() ?? null,
          resultDate: timeline.resultDate?.toISOString() ?? null,
        },
        summary: {
          vacancyTotal: relevantProvas.reduce(
            (acc, p) => acc + (p.vacancyCount ?? 0),
            0,
          ),
          hasCR: relevantProvas.some((p) => p.hasReserveList),
          salaryMin: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) < Number(a) ? b : a)))
            : null,
          salaryMax: salaries.length
            ? String(salaries.reduce((a, b) => (Number(b) > Number(a) ? b : a)))
            : null,
          registrationFee: fees.size === 1 ? [...fees][0] : null,
          cargoCount: relevantProvas.length,
        },
      },
      cargos: cargos.map((p) => ({
        id: p.id,
        slug: p.slug,
        role: p.role,
        vacancyCount: p.vacancyCount,
        hasReserveList: p.hasReserveList,
        salaryBase: p.salaryBase != null ? String(p.salaryBase) : null,
        workload: p.workload,
        questionCount: p._count.questions,
        minPassingGrade:
          p.minPassingGradeNonQuota != null
            ? String(p.minPassingGradeNonQuota)
            : null,
        published: p.published,
        userStats: statsByExamBaseId.get(p.id) ?? {
          attemptCount: 0,
          bestScore: null,
        },
      })),
    };
  }

  /**
   * Plano de estudos do usuário sobre um conjunto de provas-alvo (a própria
   * prova do cargo ou, quando ela é futura/sem questões, as edições
   * anteriores). Anônimo ou sem tentativa finalizada → `diagnostico` zerado.
   * `scoreDelta` compara o melhor score com a primeira tentativa;
   * `weakSubjects` são as 3 piores matérias por acurácia (% inteiro), com no
   * mínimo MIN_ANSWERS_PER_SUBJECT questões respondidas.
   */
  private async getStudyPlan(
    userId: string | undefined,
    examBaseIds: string[],
    passingGrade: number,
  ): Promise<{
    currentStep: StudyPlanStep;
    attemptCount: number;
    bestScore: number | null;
    scoreDelta: number | null;
    weakSubjects: { subject: string; accuracy: number }[];
  }> {
    const empty = {
      currentStep: 'diagnostico' as StudyPlanStep,
      attemptCount: 0,
      bestScore: null,
      scoreDelta: null,
      weakSubjects: [],
    };
    if (!userId || examBaseIds.length === 0) return empty;

    const attempts = await this.prisma.examBaseAttempt.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        examBaseId: { in: examBaseIds },
      },
      orderBy: { finishedAt: 'asc' },
      select: { scorePercentage: true },
    });
    if (attempts.length === 0) return empty;

    const scores = attempts
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

    // Acurácia por matéria (ExamBaseQuestion.subject) nas respostas do
    // usuário; só questões efetivamente respondidas (alternativa marcada).
    const answers = await this.prisma.examBaseAttemptAnswer.findMany({
      where: {
        selectedAlternativeId: { not: null },
        examBaseAttempt: {
          userId,
          finishedAt: { not: null },
          examBaseId: { in: examBaseIds },
        },
      },
      select: {
        selectedAlternative: { select: { key: true } },
        examBaseQuestion: {
          select: { subject: true, correctAlternative: true },
        },
      },
    });
    const bySubject = new Map<string, { answered: number; correct: number }>();
    for (const a of answers) {
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

    return {
      currentStep,
      attemptCount: attempts.length,
      bestScore,
      scoreDelta,
      weakSubjects,
    };
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

    const cargo = await this.prisma.examBase.findFirst({
      where: {
        ...(UUID_RE.test(cargoSlugOrId)
          ? { id: cargoSlugOrId }
          : { slug: cargoSlugOrId }),
        ...concursoKey,
        isNursingRelevant: true,
        ...(showUnpublished ? {} : { published: true }),
      },
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
        registrationFee: true,
        minPassingGradeNonQuota: true,
        examDate: true,
        editalUrl: true,
        published: true,
        syllabusGroups: {
          orderBy: { order: 'asc' },
          select: { name: true, topics: true, order: true },
        },
        _count: { select: { questions: true } },
      },
    });
    if (!cargo) throw new NotFoundException('cargo not found');

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
    // Alimentam o treino quando a prova é futura.
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
    const previousStats = await this.getUserStatsByExamBase(
      userId,
      previousExams.map((p) => p.id),
    );

    // Prova futura (sem questões próprias) → plano computado sobre as
    // edições anteriores; com questões, sobre a própria prova.
    const planExamBaseIds =
      cargo._count.questions > 0 ? [cargo.id] : previousExams.map((p) => p.id);
    const passingGrade =
      cargo.minPassingGradeNonQuota != null
        ? Number(cargo.minPassingGradeNonQuota)
        : DEFAULT_PASSING_GRADE;
    const studyPlan = await this.getStudyPlan(
      userId,
      planExamBaseIds,
      passingGrade,
    );

    // Conteúdo programático só faz sentido para prova ainda não aplicada;
    // para prova passada a página foca nas provas anteriores e no treino.
    const cargoIsPast =
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
        examDate: cargo.examDate.toISOString(),
        editalUrl: cargo.editalUrl ?? concurso.editalUrl,
        published: cargo.published,
      },
      syllabusGroups: cargoIsPast ? [] : cargo.syllabusGroups,
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
