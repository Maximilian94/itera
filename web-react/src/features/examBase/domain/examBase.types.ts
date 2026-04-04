export type ProcessingPhase = 'EDITAL' | 'PROVA' | 'GABARITO' | 'REVISAO' | 'EXPLICACOES' | 'CONCLUIDO'

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
  examBoardId: string | null
  examBoard: { id: string; name: string; alias?: string | null; logoUrl?: string | null; websiteUrl?: string | null } | null
  _count?: { questions: number }
  userStats?: { attemptCount: number; bestScore: number | null }
  reviewStats?: { reviewedCount: number; totalCount: number }
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
}

