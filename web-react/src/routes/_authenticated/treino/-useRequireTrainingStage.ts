import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  TREINO_STAGES,
  getStagePath,
  getAllowedStageIndex,
  TRAINING_STAGE_TO_SLUG,
} from './-stages.config'
import type { TreinoStageSlug } from './-stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'

/**
 * Redirects to the current training stage if the user is on a stage page that is ahead.
 * Call this at the top of stage pages (diagnostico, estudo, retentativa, final).
 */
export function useRequireTrainingStage(
  trainingId: string,
  pageSlug: TreinoStageSlug,
) {
  const navigate = useNavigate()
  const { data: training, isLoading } = useTrainingQuery(trainingId)

  useEffect(() => {
    if (isLoading || !training?.currentStage || !trainingId) return
    const pageIndex = TREINO_STAGES.findIndex((s) => s.slug === pageSlug)
    const allowedIndex = getAllowedStageIndex(
      training.currentStage as Parameters<typeof getAllowedStageIndex>[0],
    )
    if (pageIndex > allowedIndex) {
      const slug = TRAINING_STAGE_TO_SLUG[
        training.currentStage as keyof typeof TRAINING_STAGE_TO_SLUG
      ]
      navigate({ to: getStagePath(slug, trainingId) })
    }
  }, [training?.currentStage, isLoading, trainingId, pageSlug, navigate])
}
