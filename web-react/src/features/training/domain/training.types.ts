export interface CreateTrainingResponse {
  trainingId: string
  attemptId: string
  examBaseId: string
  examBoardId: string | null
}

export interface TrainingListItem {
  trainingId: string
  examBaseId: string
  examBoardId: string | null
  examTitle: string
  /** Slug do cargo (nível 2) para navegar de volta. Null até o lazy-link popular. */
  cargoSlug: string | null
  /** Rótulo do cargo (role + provaLabel), ex.: "Enfermeiro · Tipo 1". */
  cargoLabel: string
  /** Slug do concurso (nível 1). Null até o lazy-link popular. */
  concursoSlug: string | null
  /** Título do concurso para agrupar, ex.: "Prefeitura de São José dos Campos 2026". */
  concursoTitle: string
  currentStage: TrainingStage
  attemptId: string
  createdAt: string
  updatedAt: string
  attemptFinishedAt: string | null
  minPassingGrade: number | null
  initialScorePercentage: number | null
  finalScorePercentage: number | null
}

export type TrainingStage =
  | 'EXAM'
  | 'DIAGNOSIS'
  | 'STUDY'
  | 'RETRY'
  | 'FINAL'

export interface TrainingState {
  trainingId: string
  currentStage: TrainingStage
  /** When true, the prova phase reveals correct/wrong + explanation right after each answer. */
  immediateFeedback: boolean
  attemptId: string
  examBaseId: string
  examBoardId: string | null
  examTitle: string
  studyCompletedSubjects: string[]
  /** When the user finished the exam (submitted). Null if still in progress. */
  attemptFinishedAt: string | null
  /** When the user finished the re-tentativa (clicked Finalizar re-tentativa). Null if not yet. */
  retryFinishedAt: string | null
  /** When retry is finished, questionId -> correctAlternativeId so the UI can show green/red. */
  retryCorrectMap?: Record<string, string>
  feedback?: import('@/features/examBaseAttempt/domain/examBaseAttempt.types').ExamAttemptFeedback
  final?: TrainingFinalPayload
}

export interface SubjectStat {
  subject: string
  correct: number
  total: number
  percentage: number
}

export interface TrainingFinalPayload {
  initialPercentage: number
  beforeStudyPercentage: number
  finalPercentage: number
  initialCorrect: number
  finalCorrect: number
  totalQuestions: number
  gainPoints: number
  gainPercent: number
  finalFeedback?: string
  subjectStatsInitial?: SubjectStat[]
  subjectStatsFinal?: SubjectStat[]
}

export interface TrainingStudyItemExercise {
  id: string
  order: number
  statement: string
  correctAlternativeKey: string
  alternatives: Array<{
    id: string
    key: string
    text: string
    isCorrect: boolean
  }>
}

export interface TrainingStudyItemResponse {
  id: string
  subject: string
  topic: string | null
  linkedQuestionIds: string[]
  /** Title of the single recommendation this study item is for. */
  recommendationTitle: string
  /** Text of the recommendation. */
  recommendationText: string
  explanation: string | null
  completedAt: string | null
  exercises: TrainingStudyItemExercise[]
}
