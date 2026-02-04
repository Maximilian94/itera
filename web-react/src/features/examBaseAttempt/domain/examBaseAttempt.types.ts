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
