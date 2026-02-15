import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useAccessState } from './useAccessState'
import type { SubscriptionPlan } from '../domain/stripe.types'

/**
 * Hook that checks if the user has active access and returns helper functions
 * for access control on the frontend.
 *
 * Usage:
 * ```tsx
 * const { hasAccess, plan, requireAccess, canStartTraining } = useRequireAccess()
 *
 * const handleStart = () => {
 *   if (!requireAccess()) return  // redirects to /planos if inactive
 *   // continue...
 * }
 * ```
 */
export function useRequireAccess() {
  const { access, isLoading } = useAccessState()
  const navigate = useNavigate()

  const hasAccess = access.status === 'active' || access.status === 'trial'
  const plan: SubscriptionPlan | null = access.status !== 'inactive' ? access.plan : null
  const trainingLimit = access.status !== 'inactive' ? access.trainingLimit : 0
  const trainingsUsedThisMonth = access.status !== 'inactive' ? access.trainingsUsedThisMonth : 0

  /**
   * Checks if the user has active access. If not, redirects to /planos.
   * @returns true if has access, false if redirected.
   */
  const requireAccess = useCallback((): boolean => {
    if (!hasAccess) {
      navigate({ to: '/planos' })
      return false
    }
    return true
  }, [hasAccess, navigate])

  /**
   * Checks if the plan allows trainings and if the monthly limit has not been reached.
   * Essencial has no trainings (limit=0). Strategic and Elite have limits.
   * @returns true if can start training, false if redirected or blocked.
   */
  const canStartTraining = useCallback((): boolean => {
    if (!hasAccess) {
      navigate({ to: '/planos' })
      return false
    }
    if (trainingLimit === 0) {
      // Essencial plan — no trainings
      return false
    }
    if (trainingsUsedThisMonth >= trainingLimit) {
      // Limit reached
      return false
    }
    return true
  }, [hasAccess, navigate, trainingLimit, trainingsUsedThisMonth])

  /**
   * Message to display when the plan does not allow trainings or the limit has been reached.
   */
  const trainingBlockedMessage = (() => {
    if (!hasAccess) return 'Assine um plano para acessar treinos.'
    if (trainingLimit === 0) return 'Seu plano (Essencial) não inclui treinos. Faça upgrade para Estratégico ou Elite.'
    if (trainingsUsedThisMonth >= trainingLimit) return `Você atingiu o limite de ${trainingLimit} treinos/mês. Faça upgrade para ter mais treinos.`
    return null
  })()

  return {
    hasAccess,
    plan,
    trainingLimit,
    trainingsUsedThisMonth,
    isLoading,
    requireAccess,
    canStartTraining,
    trainingBlockedMessage,
  }
}
