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
  examBoardId: string | null
  examBoard: { id: string; name: string; alias?: string | null; logoUrl: string; websiteUrl?: string | null } | null
  _count?: { questions: number }
  userStats?: { attemptCount: number; bestScore: number | null }
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

export type UpdateExamBaseInput = {
  name?: string
  slug?: string | null
  role?: string
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  salaryBase?: string | null
  examDate?: string
  institution?: string | null
  examBoardId?: string | null
  minPassingGradeNonQuota?: string | null
}

