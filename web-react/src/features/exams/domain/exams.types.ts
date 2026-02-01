export type ExamStatus = 'not_started' | 'in_progress' | 'finished'

export type ExamListItem = {
  id: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  status: ExamStatus
  questionCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  examBoardId: string | null
}

export type ListExamsResponse = {
  exams: ExamListItem[]
}

