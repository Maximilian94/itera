import { apiFetch } from '@/lib/api'
import type {
  CreateTrainingResponse,
  TrainingListItem,
  TrainingState,
  TrainingStudyItemResponse,
} from '../domain/training.types'

const basePath = (trainingId: string) => `/training/${trainingId}`

export const trainingService = {
  list(): Promise<TrainingListItem[]> {
    return apiFetch('/training', { method: 'GET' })
  },

  create(examBaseId: string): Promise<CreateTrainingResponse> {
    return apiFetch(`/training/exam-bases/${examBaseId}`, { method: 'POST' })
  },

  getOne(trainingId: string): Promise<TrainingState> {
    return apiFetch(basePath(trainingId), { method: 'GET' })
  },

  updateStage(
    trainingId: string,
    stage: string,
  ): Promise<TrainingState> {
    return apiFetch(`${basePath(trainingId)}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    })
  },

  updateStudy(
    trainingId: string,
    subject: string,
    completed: boolean,
  ): Promise<{ studyCompletedSubjects: string[] }> {
    return apiFetch(`${basePath(trainingId)}/study`, {
      method: 'PATCH',
      body: JSON.stringify({ subject, completed }),
    })
  },

  listStudyItems(
    trainingId: string,
  ): Promise<TrainingStudyItemResponse[]> {
    return apiFetch(`${basePath(trainingId)}/study-items`, { method: 'GET' })
  },

  completeStudyItem(
    trainingId: string,
    studyItemId: string,
    completed: boolean,
  ): Promise<{ studyCompletedSubjects: string[] }> {
    return apiFetch(
      `${basePath(trainingId)}/study-items/${studyItemId}/complete`,
      {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      },
    )
  },

  generateStudyItemContent(
    trainingId: string,
    studyItemId: string,
  ): Promise<TrainingStudyItemResponse | null> {
    return apiFetch(
      `${basePath(trainingId)}/study-items/${studyItemId}/generate`,
      { method: 'POST' },
    )
  },

  listRetryQuestions(trainingId: string): Promise<Array<{
    id: string
    statement: string
    statementImageUrl: string | null
    referenceText: string | null
    subject: string | null
    topic: string | null
    alternatives: Array<{ id: string; key: string; text: string }>
  }>> {
    return apiFetch(`${basePath(trainingId)}/retry-questions`, {
      method: 'GET',
    })
  },

  /** Retry questions with correctAlternative and explanation (only when retry is finished). */
  listRetryQuestionsWithFeedback(trainingId: string): Promise<Array<{
    id: string
    statement: string
    statementImageUrl: string | null
    referenceText: string | null
    subject: string | null
    topic: string | null
    correctAlternative: string | null
    alternatives: Array<{ id: string; key: string; text: string; explanation: string | null }>
  }>> {
    return apiFetch(`${basePath(trainingId)}/retry-questions/with-feedback`, {
      method: 'GET',
    })
  },

  getRetryAnswers(trainingId: string): Promise<Record<string, string>> {
    return apiFetch(`${basePath(trainingId)}/retry-answers`, {
      method: 'GET',
    })
  },

  upsertRetryAnswer(
    trainingId: string,
    questionId: string,
    selectedAlternativeId: string,
  ): Promise<{ questionId: string; selectedAlternativeId: string }> {
    return apiFetch(`${basePath(trainingId)}/retry-answers`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, selectedAlternativeId }),
    })
  },

  getFinal(trainingId: string): Promise<import('../domain/training.types').TrainingFinalPayload> {
    return apiFetch(`${basePath(trainingId)}/final`, { method: 'GET' })
  },
}
