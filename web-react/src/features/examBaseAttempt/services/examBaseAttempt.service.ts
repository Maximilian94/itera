import { apiFetch } from '@/lib/api'
import type {
  ExamBaseAttempt,
  ExamBaseAttemptWithQuestionsAndAnswers,
  ExamBaseAttemptHistoryItem,
  ExamAttemptFeedback,
  UpsertAnswerInput,
} from '../domain/examBaseAttempt.types'

const basePath = (examBaseId: string) => `/exam-bases/${examBaseId}/attempts`

export const examBaseAttemptService = {
  listHistory(examBaseId?: string): Promise<ExamBaseAttemptHistoryItem[]> {
    const url =
      examBaseId != null
        ? `/exam-base-attempts/history?examBaseId=${encodeURIComponent(examBaseId)}`
        : '/exam-base-attempts/history'
    return apiFetch(url, { method: 'GET' })
  },

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

  getFeedback(
    examBaseId: string,
    attemptId: string,
  ): Promise<ExamAttemptFeedback> {
    return apiFetch(`${basePath(examBaseId)}/${attemptId}/feedback`, {
      method: 'GET',
    })
  },

  /**
   * Generates AI feedback per subject for a finished attempt (e.g. older attempts).
   * Saves result in DB; refetch feedback to see it.
   */
  generateSubjectFeedback(
    examBaseId: string,
    attemptId: string,
  ): Promise<{ generated: boolean; subjectFeedback?: Record<string, { evaluation: string; recommendations: Array<{ title: string; text: string }> }> }> {
    return apiFetch(`${basePath(examBaseId)}/${attemptId}/feedback/generate`, {
      method: 'POST',
    })
  },
}
