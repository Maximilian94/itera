import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treino/$trainingId')({
  component: TrainingIdLayout,
})

function TrainingIdLayout() {
  return <Outlet />
}
