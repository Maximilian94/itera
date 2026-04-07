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
  /** Texto de referência da prova (ex.: texto base compartilhado por várias questões). */
  referenceText?: string
  alternatives: { key: string; text: string }[]
}

export type ParsedQuestionStructure = {
  number: number
  subject: string
  topic: string
  subtopics: string[]
  statement: string
  referenceText: string | null
  hasImage: boolean
  alternatives: { key: string; text: string }[]
}

export type ParsedQuestionFromPdf = {
  number: number
  subject: string
  topic: string
  subtopics: string[]
  statement: string
  referenceText: string | null
  hasImage: boolean
  alternatives: { key: string; text: string; explanation: string }[]
  correctAlternative: string | null
  answerDoubt: boolean
  doubtReason: string | null
}

export type GenerateExplanationsResponse = {
  topic: string
  subtopics: string[]
  explanations: Array<{ key: string; explanation: string }>
  agreesWithCorrectAnswer: boolean
  disagreementWarning?: string
}

export type GenerateMetadataResponse = {
  topic: string
  subtopics: string[]
  skills: string[]
}

const basePath = (examBaseId: string) => `/exam-bases/${examBaseId}/questions`

export type ExamBaseQuestionWithSource = ExamBaseQuestion & {
  examBase: { id: string; name: string; institution: string | null }
}

export const examBaseQuestionsService = {
  list(examBaseId: string): Promise<ExamBaseQuestion[]> {
    return apiFetch<ExamBaseQuestion[]>(basePath(examBaseId), { method: 'GET' })
  },

  reorder(examBaseId: string, questionIds: string[]): Promise<void> {
    return apiFetch<void>(`${basePath(examBaseId)}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ questionIds }),
    })
  },

  getQuestionsCountBySubject(
    examBaseId: string,
  ): Promise<Array<{ subject: string; count: number }>> {
    return apiFetch<Array<{ subject: string; count: number }>>(
      `${basePath(examBaseId)}/stats-by-subject`,
      { method: 'GET' },
    )
  },

  listAvailableToAdd(
    examBaseId: string,
    subject?: string,
  ): Promise<ExamBaseQuestionWithSource[]> {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : ''
    return apiFetch<ExamBaseQuestionWithSource[]>(
      `${basePath(examBaseId)}/available-to-add${params}`,
      { method: 'GET' },
    )
  },

  listAvailableSubjects(examBaseId: string): Promise<string[]> {
    return apiFetch<string[]>(
      `${basePath(examBaseId)}/available-to-add/subjects`,
      { method: 'GET' },
    )
  },

  copyQuestion(
    examBaseId: string,
    sourceExamBaseId: string,
    sourceQuestionId: string,
  ): Promise<ExamBaseQuestion> {
    return apiFetch<ExamBaseQuestion>(`${basePath(examBaseId)}/copy`, {
      method: 'POST',
      body: JSON.stringify({
        sourceExamBaseId,
        sourceQuestionId,
      }),
    })
  },

  parseFromMarkdown(
    examBaseId: string,
    markdown: string,
    provider: 'grok' | 'chatgpt' = 'grok',
  ): Promise<{ questions: ParsedQuestionItem[]; rawResponse: string }> {
    return apiFetch<{ questions: ParsedQuestionItem[]; rawResponse: string }>(
      `${basePath(examBaseId)}/parse-from-markdown`,
      {
        method: 'POST',
        body: JSON.stringify({ markdown, provider }),
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

  generateMetadata(
    examBaseId: string,
    questionId: string,
    subject?: string,
  ): Promise<GenerateMetadataResponse> {
    return apiFetch<GenerateMetadataResponse>(
      `${basePath(examBaseId)}/${questionId}/generate-metadata`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject ?? null }),
      },
    )
  },

  generateSubject(
    examBaseId: string,
    questionId: string,
  ): Promise<{ subject: string }> {
    return apiFetch<{ subject: string }>(
      `${basePath(examBaseId)}/${questionId}/generate-subject`,
      { method: 'POST' },
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

  parseFromMarkdownAndGabarito(
    examBaseId: string,
    markdown: string,
    gabaritoPdf: File,
  ): Promise<{ questions: ParsedQuestionFromPdf[] }> {
    const formData = new FormData()
    formData.append('markdown', markdown)
    formData.append('gabaritoPdf', gabaritoPdf)
    return apiFetch<{ questions: ParsedQuestionFromPdf[] }>(
      `${basePath(examBaseId)}/parse-from-markdown-and-gabarito`,
      { method: 'POST', body: formData },
    )
  },

  extractGabaritoAnswerKey(
    examBaseId: string,
    gabaritoPdf: File,
    cargo?: string,
  ): Promise<{ answerKey: Record<string, string> }> {
    const formData = new FormData()
    formData.append('gabaritoPdf', gabaritoPdf)
    if (cargo) formData.append('cargo', cargo)
    return apiFetch<{ answerKey: Record<string, string> }>(
      `${basePath(examBaseId)}/extract-gabarito-answer-key`,
      { method: 'POST', body: formData },
    )
  },

  parseMarkdownChunk(
    examBaseId: string,
    markdownChunk: string,
    answerKey: Record<string, string>,
  ): Promise<{ questions: ParsedQuestionFromPdf[] }> {
    return apiFetch<{ questions: ParsedQuestionFromPdf[] }>(
      `${basePath(examBaseId)}/parse-markdown-chunk`,
      { method: 'POST', body: JSON.stringify({ markdownChunk, answerKey }) },
    )
  },

parseQuestionsStructureFromChunk(
    examBaseId: string,
    markdownChunk: string,
  ): Promise<{ questions: ParsedQuestionStructure[] }> {
    return apiFetch<{ questions: ParsedQuestionStructure[] }>(
      `${basePath(examBaseId)}/parse-questions-structure`,
      { method: 'POST', body: JSON.stringify({ markdownChunk }) },
    )
  },

  ocrFromPdf(
    examBaseId: string,
    file: File,
    provider: 'mistral' | 'nanonets' | 'combined' = 'mistral',
  ): Promise<{ markdown: string; imageMarkdown?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return apiFetch<{ markdown: string; imageMarkdown?: string }>(
      `${basePath(examBaseId)}/ocr-from-pdf?provider=${provider}`,
      { method: 'POST', body: formData },
    )
  },

  parseQuestionsFromMarkdownStructure(
    examBaseId: string,
    markdown: string,
    imageMarkdown?: string,
  ): Promise<{ questions: ParsedQuestionStructure[] }> {
    return apiFetch<{ questions: ParsedQuestionStructure[] }>(
      `${basePath(examBaseId)}/parse-from-pdf`,
      { method: 'POST', body: JSON.stringify({ markdown, imageMarkdown }) },
    )
  },

  review(examBaseId: string, questionId: string): Promise<ExamBaseQuestion> {
    return apiFetch<ExamBaseQuestion>(
      `${basePath(examBaseId)}/${questionId}/review`,
      { method: 'POST' },
    )
  },

  removeReview(examBaseId: string, questionId: string): Promise<ExamBaseQuestion> {
    return apiFetch<ExamBaseQuestion>(
      `${basePath(examBaseId)}/${questionId}/review`,
      { method: 'DELETE' },
    )
  },

  generateExplanationsInline(
    examBaseId: string,
    input: {
      subject?: string
      statement: string
      referenceText?: string | null
      statementImageUrl?: string | null
      correctAlternative: string
      alternatives: { key: string; text: string }[]
      examName?: string
    },
  ): Promise<GenerateExplanationsResponse> {
    return apiFetch<GenerateExplanationsResponse>(
      `${basePath(examBaseId)}/generate-explanations-inline`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  },

  createBatch(
    examBaseId: string,
    questions: CreateExamBaseQuestionInput[],
  ): Promise<ExamBaseQuestion[]> {
    return apiFetch<ExamBaseQuestion[]>(`${basePath(examBaseId)}/batch`, {
      method: 'POST',
      body: JSON.stringify({ questions }),
    })
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
