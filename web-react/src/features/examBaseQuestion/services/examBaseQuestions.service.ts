import { apiFetch, ApiError } from '@/lib/api'
import type {
  CreateAlternativeInput,
  CreateExamBaseQuestionInput,
  ExamBaseQuestion,
  UpdateAlternativeInput,
  UpdateExamBaseQuestionInput,
} from '../domain/examBaseQuestion.types'

export type ParsedQuestionItem = {
  subject: string
  statement: string
  topic?: string
  alternatives: { key: string; text: string }[]
}

export type GenerateExplanationsResponse = {
  topic: string
  subtopics: string[]
  explanations: Array<{ key: string; explanation: string }>
}

const basePath = (examBaseId: string) => `/exam-bases/${examBaseId}/questions`

export const examBaseQuestionsService = {
  list(examBaseId: string): Promise<ExamBaseQuestion[]> {
    return apiFetch<ExamBaseQuestion[]>(basePath(examBaseId), { method: 'GET' })
  },

  parseFromMarkdown(
    examBaseId: string,
    markdown: string,
  ): Promise<{ questions: ParsedQuestionItem[]; rawResponse: string }> {
    return apiFetch<{ questions: ParsedQuestionItem[]; rawResponse: string }>(
      `${basePath(examBaseId)}/parse-from-markdown`,
      {
        method: 'POST',
        body: JSON.stringify({ markdown }),
      },
    )
  },

  extractFromPdf(
    examBaseId: string,
    file: File,
  ): Promise<{ content: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch<{ content: string }>(
      `${basePath(examBaseId)}/extract-from-pdf`,
      {
        method: 'POST',
        body: formData,
      },
    )
  },

  uploadStatementImage(
    examBaseId: string,
    file: File,
  ): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch<{ url: string }>(
      `${basePath(examBaseId)}/upload-statement-image`,
      {
        method: 'POST',
        body: formData,
      },
    )
  },

  create(
    examBaseId: string,
    input: CreateExamBaseQuestionInput,
  ): Promise<ExamBaseQuestion> {
    return apiFetch<ExamBaseQuestion>(basePath(examBaseId), {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  update(
    examBaseId: string,
    questionId: string,
    input: UpdateExamBaseQuestionInput,
  ): Promise<ExamBaseQuestion> {
    return apiFetch<ExamBaseQuestion>(
      `${basePath(examBaseId)}/${questionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  },

  delete(examBaseId: string, questionId: string): Promise<void> {
    return apiFetch<void>(`${basePath(examBaseId)}/${questionId}`, {
      method: 'DELETE',
    })
  },

  createAlternative(
    examBaseId: string,
    questionId: string,
    input: CreateAlternativeInput,
  ): Promise<ExamBaseQuestion['alternatives'][0]> {
    return apiFetch<ExamBaseQuestion['alternatives'][0]>(
      `${basePath(examBaseId)}/${questionId}/alternatives`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  },

  updateAlternative(
    examBaseId: string,
    questionId: string,
    alternativeId: string,
    input: UpdateAlternativeInput,
  ): Promise<ExamBaseQuestion['alternatives'][0]> {
    return apiFetch<ExamBaseQuestion['alternatives'][0]>(
      `${basePath(examBaseId)}/${questionId}/alternatives/${alternativeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  },

  deleteAlternative(
    examBaseId: string,
    questionId: string,
    alternativeId: string,
  ): Promise<void> {
    return apiFetch<void>(
      `${basePath(examBaseId)}/${questionId}/alternatives/${alternativeId}`,
      { method: 'DELETE' },
    )
  },

  generateExplanations(
    examBaseId: string,
    questionId: string,
  ): Promise<GenerateExplanationsResponse> {
    return apiFetch<GenerateExplanationsResponse>(
      `${basePath(examBaseId)}/${questionId}/generate-explanations`,
      { method: 'POST' },
    )
  },
}

export function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}

export function getApiMessage(err: unknown): string {
  if (err instanceof ApiError && typeof err.body === 'object' && err.body && 'message' in err.body) {
    return String((err.body as { message: unknown }).message)
  }
  if (err instanceof Error) return err.message
  return 'An error occurred'
}
