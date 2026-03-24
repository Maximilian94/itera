import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treino/$trainingId')({
  /**
   * Layout for all specific training routes. No frontend gate here — the API
   * validates ownership (userId) on every request. Free onboarding users must
   * be able to access their single free training session.
   */
  component: () => <Outlet />,
})
