import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useRequireTrainingStage } from '../-useRequireTrainingStage'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/retentativa',
)({
  component: RetentativaLayout,
})

function RetentativaLayout() {
  const { trainingId } = Route.useParams()
  useRequireTrainingStage(trainingId, 'retentativa')
  return <Outlet />
}
