export type ExamBaseQuestionAlternative = {
  id: string
  createdAt: string
  updatedAt: string
  key: string
  text: string
  explanation: string
}

export type ExamBaseQuestion = {
  id: string
  createdAt: string
  updatedAt: string
  examBaseId: string
  subject: string
  topic: string
  subtopics: string[]
  statement: string
  statementImageUrl: string | null
  /** Texto de referência da prova (ex.: texto base compartilhado por várias questões). */
  referenceText: string | null
  correctAlternative: string | null
  skills: string[]
  alternatives: ExamBaseQuestionAlternative[]
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
