import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'

/**
 * Começar um ciclo de treino SEM sair da página: cria a sessão e deixa a
 * invalidação de `GET /training` trazer o novo `session` (estágio EXAM) — o
 * TrainingFlow então embute o player da prova ali mesmo. Nada de navegar
 * para /treino.
 */
export function useProgramActions(examBaseId: string) {
  const { requireAccess } = useRequireAccess()
  const createTraining = useCreateTrainingMutation()

  const start = (onStarted?: () => void) => {
    if (!requireAccess()) return
    createTraining.mutate(
      { examBaseId, immediateFeedback: true },
      { onSuccess: () => onStarted?.() },
    )
  }

  return {
    start,
    isStarting: createTraining.isPending,
    isError: createTraining.isError,
  }
}
