/**
 * Tipos espelhando 1:1 os payloads da API de concurso (MAX-11/MAX-28):
 * - GET /concursos                            → ConcursoListResponse
 * - GET /concursos/:slug                      → ConcursoDetail
 * - GET /concursos/:slug/cargos/:cargoSlug    → CargoDetail
 * - GET /exam-bases/:id/subject-distribution  → SubjectDistribution
 * - GET /exam-bases/:id/competition-history   → CompetitionHistory
 *
 * Sem lógica aqui: status temporal, modo da distribuição e plano de estudos
 * vêm prontos do backend.
 */

/** Status temporal do concurso, derivado no backend (concurso-status.ts). */
export type ConcursoStatus = 'open' | 'future' | 'past'

export type GovernmentScope = 'MUNICIPAL' | 'STATE' | 'FEDERAL'

// ── Listagem/descoberta (nível 0, MAX-28) ────────────────────────────────────

/** Card de concurso na listagem; `slug` aceita UUID de prova (fallback lazy). */
export type ConcursoListItem = {
  /** Id do Concurso já vinculado; null até o lazy-link rodar. */
  id: string | null
  /** Alvo de navegação: slug do concurso ou id de prova representante. */
  slug: string
  institution: string
  year: number
  governmentScope: GovernmentScope
  state: string | null
  city: string | null
  examBoard: ExamBoardRef | null
  status: ConcursoStatus
  timeline: ConcursoTimeline
  cargoCount: number
  vacancyTotal: number
  hasCR: boolean
  salaryMin: string | null
  salaryMax: string | null
  questionCount: number
  userStats: {
    /** Quantos cargos do concurso o usuário já tentou (0 para anônimo). */
    attemptedCargos: number
    /** Melhor nota entre os cargos; null sem tentativa. */
    bestScore: number | null
  }
}

export type ConcursoListResponse = { concursos: Array<ConcursoListItem> }

/** Filtros server-side da listagem; espelham os antigos filtros de /exams. */
export type ConcursoListFilters = {
  q?: string
  scope?: GovernmentScope
  state?: string
  city?: string
  examBoardId?: string
  status?: ConcursoStatus
}

export type ExamBoardRef = {
  id: string
  name: string
  alias: string | null
}

/** Estatísticas do usuário logado numa prova; zerado para anônimo. */
export type UserExamStats = {
  attemptCount: number
  bestScore: number | null
}

/** Datas agregadas das provas do concurso (ISO strings). */
export type ConcursoTimeline = {
  registrationStart: string | null
  registrationEnd: string | null
  examDate: string | null
  resultDate: string | null
}

/** Agregados do hero (só provas nursing-relevant). */
export type ConcursoSummaryStats = {
  vacancyTotal: number
  /** Algum cargo tem cadastro de reserva. */
  hasCR: boolean
  salaryMin: string | null
  salaryMax: string | null
  /** Taxa única entre os cargos; null quando as taxas divergem. */
  registrationFee: string | null
  cargoCount: number
}

/** Card de cargo na página do concurso (nível 1), ordenado por salário desc. */
export type CargoSummary = {
  id: string
  slug: string | null
  role: string
  vacancyCount: number | null
  hasReserveList: boolean
  salaryBase: string | null
  workload: string | null
  questionCount: number
  minPassingGrade: string | null
  published: boolean
  userStats: UserExamStats
}

/** Payload canônico da página do concurso (nível 1). */
export type ConcursoDetail = {
  concurso: {
    id: string
    slug: string | null
    institution: string
    year: number
    governmentScope: GovernmentScope
    state: string | null
    city: string | null
    examBoard: ExamBoardRef | null
    editalUrl: string | null
    status: ConcursoStatus
    timeline: ConcursoTimeline
    summary: ConcursoSummaryStats
  }
  cargos: Array<CargoSummary>
}

// ── Página do cargo (nível 2) ────────────────────────────────────────────────

export type StudyPlanStep = 'diagnostico' | 'treino_dirigido' | 'reta_final'

/** Plano de estudos do usuário para o cargo; anônimo → `diagnostico` zerado. */
export type StudyPlan = {
  currentStep: StudyPlanStep
  attemptCount: number
  bestScore: number | null
  /** Melhor score − primeira tentativa; null sem scores mensuráveis. */
  scoreDelta: number | null
  /** 3 piores matérias por acurácia (% inteiro 0..100). */
  weakSubjects: Array<{ subject: string; accuracy: number }>
}

/** Grupo do conteúdo programático do edital (vazio para prova passada). */
export type CargoSyllabusGroup = {
  name: string
  topics: string
  order: number
}

/** Edição anterior do mesmo cargo/banca/instituição. */
export type CargoPreviousExam = {
  examBaseId: string
  slug: string | null
  year: number
  questionCount: number
  userStats: UserExamStats
}

/** Uma prova (tipo) do cargo. Cargo de prova única → array de 1. */
export type CargoProva = {
  examBaseId: string
  slug: string | null
  /** Rótulo da prova ("Tipo 1", "Amarela"); null quando o cargo tem 1 prova. */
  label: string | null
  isPrimary: boolean
  examDate: string
  questionCount: number
  userStats: UserExamStats
  /** Plano de estudos específico desta prova (o seletor re-escopa o plano). */
  studyPlan: StudyPlan
}

/** Prova recomendada para treinar (mesmo cargo, fora deste edital). tier 1 =
 *  mesma banca; tier 2 = mesmo cargo, outra banca. */
export type RelatedProva = {
  examBaseId: string
  slug: string | null
  institution: string | null
  year: number
  /** Banca da própria prova (pode diferir da do concurso no tier 2). */
  examBoardId: string | null
  examBoardAlias: string | null
  tier: 1 | 2
  questionCount: number
  userStats: UserExamStats
  studyPlan: StudyPlan
}

/** Payload da página do cargo (nível 2). */
export type CargoDetail = {
  concurso: {
    id: string
    slug: string | null
    institution: string
    year: number
    status: ConcursoStatus
    examBoard: ExamBoardRef | null
    examDate: string | null
  }
  cargo: {
    id: string
    slug: string | null
    role: string
    description: string | null
    requirements: string | null
    salaryBase: string | null
    workload: string | null
    vacancyCount: number | null
    hasReserveList: boolean
    registrationFee: string | null
    minPassingGrade: string | null
    questionCount: number
    examDate: string
    editalUrl: string | null
    published: boolean
  }
  syllabusGroups: Array<CargoSyllabusGroup>
  /** Provas (tipos) do cargo. ≥2 → o cargo tem várias provas a escolher. */
  provas: Array<CargoProva>
  /** Provas recomendadas p/ treinar (mesmo cargo). Vazio quando não há acervo. */
  relatedProvas: Array<RelatedProva>
  previousExams: Array<CargoPreviousExam>
  studyPlan: StudyPlan
}

// ── Distribuição por matéria (bloco do nível 2, MAX-17) ─────────────────────

/** `actual` = questões da própria prova (passada); `historical` = edições anteriores (futura). */
export type SubjectDistributionMode = 'actual' | 'historical'

export type SubjectDistribution = {
  mode: SubjectDistributionMode
  sourceExams: Array<{ examBaseId: string; year: number }>
  totalQuestions: number
  subjects: Array<{
    subject: string
    count: number
    /** Razão crua 0..1; arredondamento é responsabilidade do front. */
    share: number
    /** Fração 0..1; null para anônimo ou abaixo de 5 respostas. */
    userAccuracy: number | null
  }>
  insight: {
    topSubjects: Array<string>
    topShare: number
    weakestRelevant: { subject: string; accuracy: number } | null
  }
}

// ── Concorrência histórica (bloco do nível 2, MAX-18) ───────────────────────

export type CompetitionEdition = {
  examBaseId: string
  year: number
  applicantCount: number | null
  vacancyCount: number | null
  /** Candidatos por vaga, arredondado; null se faltar inscritos ou vagas. */
  perVacancy: number | null
  /** Nota MÍNIMA do edital — NÃO é o corte real da última vaga. */
  minPassingGrade: string | null
  /** Corte REAL da última vaga; preenchimento manual, null até existir. */
  actualCutScore: string | null
}

export type CompetitionHistory = {
  editions: Array<CompetitionEdition>
}
