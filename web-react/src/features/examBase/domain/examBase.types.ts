export type ProcessingPhase = 'EDITAL' | 'PROVA' | 'GABARITO' | 'REVISAO' | 'EXPLICACOES' | 'CONCLUIDO'

/** Grupo do conteúdo programático do edital (ex.: "Saúde Coletiva e SUS"). */
export type ExamSyllabusGroup = {
  id: string
  order: number
  name: string
  /** Tópicos em texto corrido, como no edital. */
  topics: string
}

export type ExamBase = {
  id: string
  name: string
  slug: string | null
  institution: string | null
  role: string
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string | null
  city: string | null
  salaryBase: string | null
  examDate: string
  minPassingGradeNonQuota: string | null
  published?: boolean
  editalUrl: string | null
  adminNotes?: string | null
  processingPhase?: ProcessingPhase
  vacancyCount: number | null
  applicantCount: number | null
  registrationFee: string | null
  registrationDate: string | null
  description: string | null
  workload: string | null
  /** Quando false, o cargo fica fora da página do concurso (ex.: Médico). */
  isNursingRelevant: boolean
  examBoardId: string | null
  examBoard: { id: string; name: string; alias?: string | null; logoUrl?: string | null; websiteUrl?: string | null } | null
  /** Conteúdo programático do edital, ordenado. Presente apenas no detalhe (getOne). */
  syllabusGroups?: ExamSyllabusGroup[]
  _count?: { questions: number }
  userStats?: { attemptCount: number; bestScore: number | null }
  reviewStats?: { reviewedCount: number; totalCount: number }
}

/** A sibling prova (cargo) inside the same concurso. */
export type ConcursoProva = {
  id: string
  role: string
  slug: string | null
  salaryBase: string | null
  vacancyCount: number | null
  examDate: string
  examBoardId: string | null
  published: boolean
  minPassingGradeNonQuota: string | null
  questionCount: number
  isCurrent: boolean
  userStats: { attemptCount: number; bestScore: number | null }
}

/** Concurso (edital) identity shared by every prova it contains. */
export type ConcursoSummary = {
  id: string
  slug: string | null
  institution: string
  year: number
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string | null
  city: string | null
  editalUrl: string | null
}

export type ConcursoProvasResponse = {
  concurso: ConcursoSummary | null
  provas: ConcursoProva[]
}

export type CreateExamBaseInput = {
  name: string
  role: string
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  salaryBase?: string | null
  examDate: string
  institution?: string
  examBoardId?: string
  minPassingGradeNonQuota?: string | null
}

export type ExtractedExamMetadata = {
  name?: string
  role?: string
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  examDate?: string
  institution?: string
  state?: string | null
  city?: string | null
  salaryBase?: string | null
  minPassingGradeNonQuota?: string | null
  examBoardName?: string | null
  examBoardAlias?: string | null
  editalUrl?: string | null
  vacancyCount?: number | null
  applicantCount?: number | null
  registrationFee?: string | null
  registrationDate?: string | null
  description?: string | null
  workload?: string | null
}

export type UpdateExamBaseInput = {
  name?: string
  slug?: string | null
  editalUrl?: string | null
  adminNotes?: string | null
  role?: string
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  salaryBase?: string | null
  examDate?: string
  institution?: string | null
  examBoardId?: string | null
  minPassingGradeNonQuota?: string | null
  processingPhase?: ProcessingPhase
  vacancyCount?: number | null
  applicantCount?: number | null
  registrationFee?: string | null
  registrationDate?: string | null
  description?: string | null
  workload?: string | null
  isNursingRelevant?: boolean
}

