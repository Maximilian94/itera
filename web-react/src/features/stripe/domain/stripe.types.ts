/** Available subscription plan. */
export type SubscriptionPlan = 'ESSENCIAL' | 'ESTRATEGICO' | 'ELITE'

/** Body for creating a checkout session. */
export type CreateCheckoutSessionBody = {
  priceId: string
  successUrl?: string
  cancelUrl?: string
}

/** Response from creating a checkout session. */
export type CreateCheckoutSessionResponse = {
  url: string
}

/** Body for creating a Customer Portal session. */
export type CreateCustomerPortalBody = {
  returnUrl?: string
}

/** Response from creating a Customer Portal session. */
export type CreateCustomerPortalResponse = {
  url: string
}

/**
 * Plan information returned by GET /stripe/plans.
 * Includes prices, features and limits for display on the plans page.
 */
export type PlanInfo = {
  plan: SubscriptionPlan
  /** Human-readable plan name (e.g. "Strategic"). */
  name: string
  /** Short plan description. */
  description: string
  /** List of plan features for display. */
  features: string[]
  /** Monthly price in cents (e.g. 4990 = R$ 49.90). */
  monthlyAmount: number
  /** Yearly price in cents. */
  yearlyAmount: number
  /** ISO 4217 currency (e.g. "brl"). */
  currency: string
  /** Stripe price ID for monthly billing. */
  monthlyPriceId: string
  /** Stripe price ID for yearly billing. */
  yearlyPriceId: string
  /** Intelligent training limit per month (0 = not available). */
  trainingLimit: number
}

/**
 * User's access state to the platform.
 * Discriminated union by "status" for safe use on the frontend.
 */
export type AccessState =
  | {
      status: 'active'
      plan: SubscriptionPlan
      currentPeriodEnd: string
      canRequestRefund: boolean
      lastPurchaseId?: string
      trainingLimit: number
      trainingsUsedThisMonth: number
    }
  | {
      status: 'trial'
      plan: SubscriptionPlan
      currentPeriodEnd: string
      canRequestRefund: boolean
      lastPurchaseId?: string
      trainingLimit: number
      trainingsUsedThisMonth: number
    }
  | { status: 'inactive' }

/** Raw response from GET /stripe/access. */
export type AccessApiResponse = {
  hasAccess: boolean
  status: 'active' | 'trial' | 'inactive'
  plan?: SubscriptionPlan
  currentPeriodEnd?: string
  canRequestRefund: boolean
  lastPurchaseId?: string
  trainingLimit?: number
  trainingsUsedThisMonth?: number
}
