export type CreateCheckoutSessionResponse = {
  url: string
}

export type CreateCheckoutSessionBody = {
  successUrl?: string
  cancelUrl?: string
}

/** Estado de acesso do usuário à plataforma */
export type AccessState =
  | { status: 'active'; accessExpiresAt: string; daysLeft: number }
  | { status: 'trial'; trialEndsAt: string; daysLeftInTrial: number }
  | { status: 'inactive' }

/** Resposta esperada do GET /stripe/access (quando existir) */
export type AccessApiResponse = {
  hasAccess: boolean
  accessExpiresAt?: string
  status: 'active' | 'trial' | 'inactive'
  trialEndsAt?: string
  daysLeft?: number
  daysLeftInTrial?: number
  canRequestRefund?: boolean
  lastPurchaseId?: string
}
