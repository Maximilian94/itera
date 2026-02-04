import { apiFetch } from '@/lib/api'
import type {
  ExamBaseAttempt,
  ExamBaseAttemptWithQuestionsAndAnswers,
  UpsertAnswerInput,
} from '../domain/examBaseAttempt.types'

const basePath = (examBaseId: string) => `/exam-bases/${examBaseId}/attempts`

export const examBaseAttemptService = {
  list(
    examBaseId: string,
  ): Promise<Array<Pick<ExamBaseAttempt, 'id' | 'examBaseId' | 'startedAt' | 'finishedAt'>>> {
    return apiFetch(basePath(examBaseId), { method: 'GET' })
  },

  create(examBaseId: string): Promise<Pick<ExamBaseAttempt, 'id' | 'examBaseId' | 'startedAt'>> {
    return apiFetch(basePath(examBaseId), { method: 'POST' })
  },

  getOne(
    examBaseId: string,
    attemptId: string,
  ): Promise<ExamBaseAttemptWithQuestionsAndAnswers> {
    return apiFetch(`${basePath(examBaseId)}/${attemptId}`, { method: 'GET' })
  },

  upsertAnswer(
    examBaseId: string,
    attemptId: string,
    input: UpsertAnswerInput,
  ): Promise<{ questionId: string; selectedAlternativeId: string | null }> {
    return apiFetch(`${basePath(examBaseId)}/${attemptId}/answers`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  finish(
    examBaseId: string,
    attemptId: string,
  ): Promise<Pick<ExamBaseAttempt, 'id' | 'examBaseId' | 'startedAt' | 'finishedAt'>> {
    return apiFetch(`${basePath(examBaseId)}/${attemptId}/finish`, {
      method: 'PATCH',
    })
  },
}
