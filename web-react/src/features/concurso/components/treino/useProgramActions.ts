import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'

/**
 * Começar um ciclo de treino SEM sair da página: cria a sessão e deixa a
 * invalidação de `GET /training` trazer o novo `session` (estágio EXAM) — o
 * TrainingFlow então embute o player da prova ali mesmo.
 *
 * A checagem é a de COTA (`canStartTraining`, T5.1), não só de assinatura:
 * plano Essencial e limite mensal esgotado bloqueiam com `blockedMessage`
 * (o CTA desabilita e mostra o motivo em vez de falhar no backend).
 */
export function useProgramActions(examBaseId: string) {
  const { canStartTraining, trainingBlockedMessage, isEliteAtLimit } =
    useRequireAccess()
  const createTraining = useCreateTrainingMutation()

  const start = (onStarted?: () => void) => {
    if (!canStartTraining()) return
    createTraining.mutate(
      { examBaseId, immediateFeedback: true },
      { onSuccess: () => onStarted?.() },
    )
  }

  return {
    start,
    isStarting: createTraining.isPending,
    isError: createTraining.isError,
    /** Motivo pelo qual começar treino está bloqueado (null = liberado). */
    blockedMessage: trainingBlockedMessage,
    /** Elite no limite: sem upgrade possível — não oferecer /planos. */
    isEliteAtLimit,
  }
}
