import type { ExamBaseQuestion } from '@/features/examBaseQuestion/domain/examBaseQuestion.types'

export type ExamBaseAttempt = {
  id: string
  examBaseId: string
  startedAt: string
  finishedAt: string | null
}

export type ExamBaseAttemptWithQuestionsAndAnswers = {
  attempt: ExamBaseAttempt
  questions: ExamBaseQuestion[]
  answers: Record<string, string | null>
}

export type UpsertAnswerInput = {
  questionId: string
  selectedAlternativeId: string | null
}

/** Item from history list: attempt + exam base info + score/passed when finished. */
export type ExamBaseAttemptHistoryItem = {
  id: string
  examBaseId: string
  startedAt: string
  finishedAt: string | null
  examBaseName: string
  institution: string | null
  examDate: string
  examBoardName: string | null
  examBoardId: string | null
  /** Logo URL of the exam board (banca). */
  examBoardLogoUrl?: string | null
  state?: string | null
  city?: string | null
  minPassingGradeNonQuota: number
  percentage: number | null
  passed: boolean | null
  /** Trend vs previous attempt (e.g. +5 or -2). When present, percentage change. */
  trendPercentage?: number | null
}

/** Full feedback for a finished attempt (overall + per-subject stats and AI feedback). */
export type ExamAttemptFeedback = {
  examTitle: string
  minPassingGradeNonQuota: number
  overall: {
    correct: number
    total: number
    percentage: number
  }
  passed: boolean
  subjectStats: Array<{
    subject: string
    correct: number
    total: number
    percentage: number
  }>
  subjectFeedback: Record<
    string,
    { evaluation: string; recommendations: string }
  >
}
