import { createFileRoute, Navigate } from '@tanstack/react-router'
import { getStagePath } from '../-stages.config'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/')({
  component: TrainingIdIndexPage,
})

function TrainingIdIndexPage() {
  const { trainingId } = Route.useParams()
  return <Navigate to={getStagePath('prova', trainingId)} />
}
