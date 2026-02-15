import { apiFetch } from '@/lib/api'
import type {
  AccessApiResponse,
  CreateCheckoutSessionBody,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalBody,
  CreateCustomerPortalResponse,
  PlanInfo,
} from '../domain/stripe.types'

/**
 * Frontend service for communicating with Stripe/subscription endpoints on the backend.
 * Centralizes all HTTP calls related to plans, checkout, access and portal.
 */
class StripeService {
  private urlPath = '/stripe'

  /** Fetches the 3 available plans with prices and features. */
  async getPlans(): Promise<PlanInfo[]> {
    return apiFetch<PlanInfo[]>(`${this.urlPath}/plans`, {
      method: 'GET',
    })
  }

  /** Returns the user's access state (active, trial or inactive). */
  async getAccess(): Promise<AccessApiResponse> {
    return apiFetch<AccessApiResponse>(`${this.urlPath}/access`, {
      method: 'GET',
    })
  }

  /** Creates a checkout session for subscription and returns the Stripe URL. */
  async createCheckoutSession(
    body: CreateCheckoutSessionBody,
  ): Promise<CreateCheckoutSessionResponse> {
    return apiFetch<CreateCheckoutSessionResponse>(
      `${this.urlPath}/checkout-session`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
  }

  /** Creates a Customer Portal session to manage the subscription. */
  async createCustomerPortal(
    body?: CreateCustomerPortalBody,
  ): Promise<CreateCustomerPortalResponse> {
    return apiFetch<CreateCustomerPortalResponse>(
      `${this.urlPath}/customer-portal`,
      {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      },
    )
  }

  /** Requests a refund for a payment (CDC 7 days). */
  async requestRefund(purchaseId: string): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>(
      `${this.urlPath}/request-refund`,
      {
        method: 'POST',
        body: JSON.stringify({ purchaseId }),
      },
    )
  }
}

export const stripeService = new StripeService()
