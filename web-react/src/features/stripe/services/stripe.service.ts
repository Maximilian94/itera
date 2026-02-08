import { apiFetch } from '@/lib/api'
import type {
  AccessApiResponse,
  CreateCheckoutSessionBody,
  CreateCheckoutSessionResponse,
} from '../domain/stripe.types'

class StripeService {
  private urlPath = '/stripe'

  async getAccess(): Promise<AccessApiResponse> {
    return apiFetch<AccessApiResponse>(`${this.urlPath}/access`, {
      method: 'GET',
    })
  }

  async createCheckoutSession(
    body?: CreateCheckoutSessionBody,
  ): Promise<CreateCheckoutSessionResponse> {
    return apiFetch<CreateCheckoutSessionResponse>(
      `${this.urlPath}/checkout-session`,
      {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      },
    )
  }
}

export const stripeService = new StripeService()
