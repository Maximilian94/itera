import { deriveOnboardingStep } from './domain/onboarding'
import {
  ackReview,
  dismissTour,
  startTour,
  useTourState,
} from './tour-state'
import type { OnboardingStep } from './domain/onboarding'
import type { UserGoal } from '@/features/goal/domain/goal.types'
import { useGoalsQuery } from '@/features/goal/queries/goal.queries'
import { usePreferenceQuery } from '@/features/preference/queries/preference.queries'

export type OnboardingState = {
  /** As duas queries já resolveram (sucesso ou erro). Antes disso, nada aparece. */
  ready: boolean
  step: OnboardingStep
  /** Coach ativo: pronto e (auto: não concluído) ou (manual: tour iniciado). */
  isActive: boolean
  /** Tour iniciado manualmente pelo botão da dashboard (refresher, mesmo já concluído). */
  isManualTour: boolean
  /** Passo 1 do tour manual pendente: perfil já existe e ainda não foi revisado. */
  reviewPending: boolean
  /** Reinicia o tour a partir da dashboard. */
  start: () => void
  /** Marca o Passo 1 (revisão do perfil) como concluído. */
  ackReview: () => void
  /** Pula/conclui o tour. */
  dismiss: () => void
  hasGoal: boolean
  /** Meta mais recente — atalho de saída do Ato 1 (handoff para o treino). */
  firstGoal: UserGoal | null
}

/**
 * Estado do onboarding do novo usuário, derivado de dados reais (perfil + meta)
 * e do override manual do tour. Fail-open: se uma query der erro, `ready` fica
 * true mesmo assim (nunca trava a UI) e o passo cai no lado seguro.
 */
export function useOnboarding(): OnboardingState {
  const prefQuery = usePreferenceQuery()
  const goalsQuery = useGoalsQuery()
  const { override, reviewed } = useTourState()

  const ready =
    (prefQuery.isSuccess || prefQuery.isError) &&
    (goalsQuery.isSuccess || goalsQuery.isError)
  const hasPreference = prefQuery.data?.preference != null
  const goals = goalsQuery.data?.goals ?? []
  const hasGoal = goals.length > 0
  const step = deriveOnboardingStep({ hasPreference, hasGoal })
  const isManualTour = override === 'active'

  const isActive = !ready
    ? false
    : isManualTour // tour manual força o coach, mesmo já concluído
      ? true
      : override === 'dismissed'
        ? false
        : step !== 'done' // automático: novo usuário até escolher a meta

  // No tour manual, o Passo 1 é rever o perfil já existente. Quando não há
  // perfil, o próprio gate (wizard) é o Passo 1 e a revisão não se aplica.
  const reviewPending = ready && isManualTour && hasPreference && !reviewed

  return {
    ready,
    step,
    isActive,
    isManualTour,
    reviewPending,
    start: startTour,
    ackReview,
    dismiss: dismissTour,
    hasGoal,
    firstGoal: goals[0] ?? null,
  }
}
