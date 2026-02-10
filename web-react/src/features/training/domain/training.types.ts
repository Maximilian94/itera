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
  currentStage: TrainingStage
  attemptId: string
  createdAt: string
  updatedAt: string
  attemptFinishedAt: string | null
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
  evaluation: string
  recommendations: Array<{ title: string; text: string }>
  explanation: string | null
  completedAt: string | null
  exercises: TrainingStudyItemExercise[]
}
