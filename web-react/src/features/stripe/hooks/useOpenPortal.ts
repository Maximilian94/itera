import { useState, useCallback } from 'react'
import { stripeService } from '../services/stripe.service'

/**
 * Hook that opens the Stripe Customer Portal and redirects the user.
 * Use when the user needs to upgrade or manage their subscription.
 *
 * @param returnPath - Path to return to after leaving the portal (e.g. '/' or '/treino')
 */
export function useOpenPortal(returnPath = '/') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPortal = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const returnUrl = `${origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`
      const { url } = await stripeService.createCustomerPortal({
        returnUrl,
      })
      if (url) window.location.href = url
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao abrir portal.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [returnPath])

  return { openPortal, loading, error }
}
