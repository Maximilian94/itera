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
  const canDoFreeTraining =
    access.status === 'inactive' && (access.canDoFreeTraining ?? false)
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
   * Also allows 1 free training for new users (onboarding).
   * Essencial has no trainings (limit=0). Strategic and Elite have limits.
   * @returns true if can start training, false if redirected or blocked.
   */
  const canStartTraining = useCallback((): boolean => {
    if (canDoFreeTraining) return true
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
  }, [canDoFreeTraining, hasAccess, navigate, trainingLimit, trainingsUsedThisMonth])

  /**
   * True when user has a plan with trainings but has reached the monthly limit.
   */
  const isLimitReached =
    hasAccess &&
    trainingLimit > 0 &&
    trainingsUsedThisMonth >= trainingLimit

  /**
   * True when user is Elite and has reached the monthly limit (no upgrade path).
   */
  const isEliteAtLimit = isLimitReached && plan === 'ELITE'

  /**
   * True when blocked because plan is Essencial (no trainings). Use for "go to /planos" CTA.
   */
  const isBlockedByEssencial = hasAccess && trainingLimit === 0

  /**
   * Message to display when the plan does not allow trainings or the limit has been reached.
   * Null when user can do free training (onboarding).
   */
  const trainingBlockedMessage = (() => {
    if (canDoFreeTraining) return null
    if (!hasAccess) return 'Assine um plano para acessar treinos.'
    if (trainingLimit === 0) return 'Seu plano (Essencial) não inclui treinos. Faça upgrade para Estratégico ou Elite.'
    if (trainingsUsedThisMonth >= trainingLimit) return `Você atingiu o limite de ${trainingLimit} treinos/mês. Faça upgrade para ter mais treinos.`
    return null
  })()

  return {
    hasAccess,
    canDoFreeTraining,
    plan,
    trainingLimit,
    trainingsUsedThisMonth,
    isLoading,
    requireAccess,
    canStartTraining,
    trainingBlockedMessage,
    isLimitReached,
    isEliteAtLimit,
    isBlockedByEssencial,
  }
}
