import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { stripeService } from '../services/stripe.service'
import type { AccessApiResponse, AccessState } from '../domain/stripe.types'

/** Query param to test states in the FE: ?access=active | trial | inactive */
export type AccessSearchParam = 'active' | 'trial' | 'inactive'

function parseAccessParam(
  param: unknown,
): AccessSearchParam | null {
  if (param === 'active' || param === 'trial' || param === 'inactive') {
    return param
  }
  return null
}

/**
 * Converts the raw API response to the AccessState discriminated union.
 * If required fields are not present, returns 'inactive'.
 */
function apiResponseToAccessState(res: AccessApiResponse): AccessState {
  if (
    (res.status === 'active' || res.status === 'trial') &&
    res.plan != null &&
    res.currentPeriodEnd != null &&
    res.trainingLimit != null &&
    res.trainingsUsedThisMonth != null
  ) {
    return {
      status: res.status,
      plan: res.plan,
      billingInterval: res.billingInterval,
      stripePriceId: res.stripePriceId,
      currentPeriodEnd: res.currentPeriodEnd,
      scheduledPlan: res.scheduledPlan,
      scheduledChangeDate: res.scheduledChangeDate,
      scheduledInterval: res.scheduledInterval,
      canRequestRefund: res.canRequestRefund,
      lastPurchaseId: res.lastPurchaseId,
      trainingLimit: res.trainingLimit,
      trainingsUsedThisMonth: res.trainingsUsedThisMonth,
    }
  }
  return {
    status: 'inactive',
    canDoFreeTraining: res.canDoFreeTraining ?? false,
  }
}

/**
 * Generates a mock AccessState for frontend testing via query param.
 */
function getMockAccessState(status: AccessSearchParam): AccessState {
  switch (status) {
    case 'active': {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      return {
        status: 'active',
        plan: 'ESTRATEGICO',
        billingInterval: 'month',
        stripePriceId: undefined,
        currentPeriodEnd: date.toISOString(),
        canRequestRefund: false,
        trainingLimit: 5,
        trainingsUsedThisMonth: 2,
      }
    }
    case 'trial': {
      const date = new Date()
      date.setDate(date.getDate() + 5)
      return {
        status: 'trial',
        plan: 'ESTRATEGICO',
        billingInterval: 'month',
        stripePriceId: undefined,
        currentPeriodEnd: date.toISOString(),
        canRequestRefund: true,
        lastPurchaseId: 'mock-purchase-id',
        trainingLimit: 5,
        trainingsUsedThisMonth: 0,
      }
    }
    default:
      return { status: 'inactive', canDoFreeTraining: true }
  }
}

/**
 * Hook that returns the logged-in user's access state.
 *
 * To test in the FE, use query param:
 * - /account?access=active  → Active (Strategic, 2/5 trainings used)
 * - /account?access=trial   → Trial (5 days remaining, can cancel)
 * - /account?access=inactive → Inactive (CTA to subscribe)
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
      return { status: 'inactive', canDoFreeTraining: false }
    }
    return apiResponseToAccessState(data)
  }, [paramOverride, isError, data])

  return {
    access,
    isLoading: paramOverride == null ? isLoading : false,
    isMock: paramOverride != null,
  }
}
