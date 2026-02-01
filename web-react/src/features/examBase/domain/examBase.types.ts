export type ExamBase = {
  id: string
  name: string
  institution: string | null
  role: string
  examDate: string
  examBoardId: string | null
  examBoard: { id: string; name: string; logoUrl: string } | null
}

export type CreateExamBaseInput = {
  name: string
  role: string
  examDate: string
  institution?: string
  examBoardId?: string
}

export type UpdateExamBaseInput = {
  name?: string
  role?: string
  examDate?: string
  institution?: string | null
  examBoardId?: string | null
}

