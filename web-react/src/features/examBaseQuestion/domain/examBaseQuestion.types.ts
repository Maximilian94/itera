export type ExamBaseQuestionAlternative = {
  id: string
  createdAt: string
  updatedAt: string
  key: string
  text: string
  explanation: string
}

export type ExamBaseQuestionReview = {
  id: string
  createdAt: string
  reviewerId: string
}

export type ExamBaseQuestion = {
  id: string
  createdAt: string
  updatedAt: string
  examBaseId: string
  createdById: string | null
  subject: string
  topic: string
  subtopics: string[]
  statement: string
  statementImageUrl: string | null
  /** Texto de referência da prova (ex.: texto base compartilhado por várias questões). */
  referenceText: string | null
  correctAlternative: string | null
  /** Flag de discordância da IA (uso interno). */
  aiDisagreement: boolean
  /** Razão da discordância da IA (uso interno). */
  aiDisagreementReason: string | null
  skills: string[]
  /** Posição na prova (0-based). */
  position?: number
  alternatives: ExamBaseQuestionAlternative[]
  reviews: ExamBaseQuestionReview[]
}

export type CreateExamBaseQuestionInput = {
  subject: string
  topic: string
  subtopics?: string[]
  statement: string
  statementImageUrl?: string | null
  referenceText?: string | null
  skills?: string[]
  correctAlternative?: string
  aiDisagreement?: boolean
  aiDisagreementReason?: string | null
  alternatives?: { key: string; text: string; explanation: string }[]
}

export type UpdateExamBaseQuestionInput = {
  subject?: string
  topic?: string
  subtopics?: string[]
  statement?: string
  statementImageUrl?: string | null
  referenceText?: string | null
  skills?: string[]
  correctAlternative?: string
}

export type CreateAlternativeInput = {
  key: string
  text: string
  explanation: string
}

export type UpdateAlternativeInput = {
  key?: string
  text?: string
  explanation?: string
}
