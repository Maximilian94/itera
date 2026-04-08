export interface AdminUserSubscription {
  id: string
  plan: 'ESSENCIAL' | 'ESTRATEGICO' | 'ELITE'
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  scheduledPlan: string | null
  createdAt: string
}

export interface AdminUserExamAttempt {
  id: string
  startedAt: string
  finishedAt: string | null
  scorePercentage: number | null
  examBase: {
    id: string
    name: string
    institution: string | null
    role: string
  }
}

export interface AdminUser {
  id: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'USER'
  createdAt: string
  lastActivity: string | null
  currentSubscription: AdminUserSubscription | null
  examAttemptCount: number
  trainingSessionCount: number
  examAttempts: AdminUserExamAttempt[]
}
