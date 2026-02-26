import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useRequireTrainingStage } from '../-useRequireTrainingStage'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/estudo')({
  component: EstudoLayout,
})

function EstudoLayout() {
  const { trainingId } = Route.useParams()
  useRequireTrainingStage(trainingId, 'estudo')
  return <Outlet />
}
