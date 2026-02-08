import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { stripeService } from '../services/stripe.service'
import type { AccessApiResponse, AccessState } from '../domain/stripe.types'

/** Query param para testar estados no FE: ?access=active | trial | inactive */
export type AccessSearchParam = 'active' | 'trial' | 'inactive'

function parseAccessParam(
  param: unknown,
): AccessSearchParam | null {
  if (param === 'active' || param === 'trial' || param === 'inactive') {
    return param
  }
  return null
}

function apiResponseToAccessState(res: AccessApiResponse): AccessState {
  if (res.status === 'active' && res.accessExpiresAt != null && res.daysLeft != null) {
    return { status: 'active', accessExpiresAt: res.accessExpiresAt, daysLeft: res.daysLeft }
  }
  if (res.status === 'trial' && res.trialEndsAt != null && res.daysLeftInTrial != null) {
    return { status: 'trial', trialEndsAt: res.trialEndsAt, daysLeftInTrial: res.daysLeftInTrial }
  }
  return { status: 'inactive' }
}

function getMockAccessState(status: AccessSearchParam): AccessState {
  const now = new Date()
  switch (status) {
    case 'active': {
      const accessExpiresAt = new Date(now)
      accessExpiresAt.setDate(accessExpiresAt.getDate() + 300)
      return {
        status: 'active',
        accessExpiresAt: accessExpiresAt.toISOString(),
        daysLeft: 300,
      }
    }
    case 'trial': {
      const trialEndsAt = new Date(now)
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)
      return {
        status: 'trial',
        trialEndsAt: trialEndsAt.toISOString(),
        daysLeftInTrial: 14,
      }
    }
    default:
      return { status: 'inactive' }
  }
}

/**
 * Retorna o estado de acesso. Para testar no FE, use query param:
 * /account?access=active  → Ativo (ex.: 300 dias restantes)
 * /account?access=trial   → Trial (ex.: 14 dias + botão cancelar)
 * /account?access=inactive → Não ativo (CTA para assinar)
 */
export function useAccessState(): {
  access: AccessState
  isLoading: boolean
  isMock: boolean
} {
  const search = useSearch({ strict: false }) as { access?: unknown }
  const paramOverride = useMemo(
    () => parseAccessParam(search?.access),
    [search?.access],
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stripe', 'access', paramOverride],
    queryFn: () => stripeService.getAccess(),
    retry: false,
    staleTime: 60_000,
    enabled: paramOverride == null,
  })

  const access: AccessState = useMemo(() => {
    if (paramOverride != null) {
      return getMockAccessState(paramOverride)
    }
    if (isError || !data) {
      return { status: 'inactive' }
    }
    return apiResponseToAccessState(data)
  }, [paramOverride, isError, data])

  return {
    access,
    isLoading: paramOverride == null ? isLoading : false,
    isMock: paramOverride != null,
  }
}
