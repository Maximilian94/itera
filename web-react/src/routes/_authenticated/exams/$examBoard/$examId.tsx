import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AccessGate } from '@/components/AccessGate'

export const Route = createFileRoute('/_authenticated/exams/$examBoard/$examId')({
  /** Layout for all specific exam routes. Requires active subscription (any plan). */
  component: () => (
    <AccessGate type="prova">
      <Outlet />
    </AccessGate>
  ),
})
