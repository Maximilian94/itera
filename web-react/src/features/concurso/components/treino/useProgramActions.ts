import { useNavigate } from '@tanstack/react-router'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
  getStagePath,
} from '@/routes/_authenticated/treino/-stages.config'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'

/**
 * Ações compartilhadas de um programa de treino: começar (cria) ou continuar
 * (retoma no estágio atual). Usado tanto pelo "próximo passo" do cargo quanto
 * pelas fases embutidas (prova/re-tentativa abrem o fluxo de responder em
 * tela cheia em /treino).
 */
export function useProgramActions(
  examBaseId: string,
  session: TrainingListItem | null,
) {
  const navigate = useNavigate()
  const { requireAccess } = useRequireAccess()
  const createTraining = useCreateTrainingMutation()
  const isFinished = session?.currentStage === 'FINAL'
  const inProgress = session != null && !isFinished

  const start = () => {
    if (!requireAccess()) return
    createTraining.mutate(
      { examBaseId, immediateFeedback: true },
      { onSuccess: (res) => void navigate({ to: getStagePath('prova', res.trainingId) }) },
    )
  }
  const resume = () => {
    if (session == null) return
    const slug =
      TREINO_STAGES[TRAINING_STAGE_ORDER.indexOf(session.currentStage)]?.slug ?? 'prova'
    void navigate({ to: getStagePath(slug, session.trainingId) })
  }
  /** Abre uma etapa específica em tela cheia (ex.: prova, re-tentativa). */
  const openStage = (slug: Parameters<typeof getStagePath>[0]) => {
    if (session == null) return
    void navigate({ to: getStagePath(slug, session.trainingId) })
  }
  return {
    isFinished,
    inProgress,
    start,
    resume,
    openStage,
    isStarting: createTraining.isPending,
    isError: createTraining.isError,
  }
}
