export type ExamBase = {
  id: string
  name: string
  institution: string | null
  role: string
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string | null
  city: string | null
  salaryBase: string | null
  examDate: string
  examBoardId: string | null
  examBoard: { id: string; name: string; logoUrl: string } | null
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
}

export type UpdateExamBaseInput = {
  name?: string
  role?: string
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  salaryBase?: string | null
  examDate?: string
  institution?: string | null
  examBoardId?: string | null
}

