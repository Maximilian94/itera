import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AccessGate } from '@/components/AccessGate'

export const Route = createFileRoute('/_authenticated/treino/$trainingId')({
  /** Layout for all specific training routes. Requires active subscription with trainings. */
  component: TrainingIdLayout,
})

function TrainingIdLayout() {
  return (
    <AccessGate type="treino">
      <Outlet />
    </AccessGate>
  )
}
