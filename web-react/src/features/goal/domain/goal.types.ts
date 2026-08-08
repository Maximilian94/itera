/** Espelho do payload de GET /goals (GoalPayload no backend). */
export interface UserGoal {
  id: string
  createdAt: string
  concurso: {
    id: string
    slug: string | null
    institution: string
    year: number
  }
  cargo: {
    id: string
    slug: string | null
    role: string
    /** Corte do edital (0–100); null quando o edital não define. */
    minPassingGrade: number | null
  }
  /** Data da prova (oficial → primeira prova → concurso). */
  examDate: string | null
  /** Provas do cargo — chave de join com as sessões de GET /training. */
  provaExamBaseIds: string[]
  oficialExamBaseId: string | null
  stats: { attemptCount: number; bestScore: number | null }
}

export interface GoalsResponse {
  goals: UserGoal[]
}

export interface CreateGoalInput {
  /** Cargo.slug | Cargo.id | ExamBase.slug | ExamBase.id (fallbacks da página do cargo). */
  cargoSlug: string
}
