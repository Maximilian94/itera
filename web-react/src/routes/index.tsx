import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
    // Redireciona direto para sign-in - sem página intermediária
    throw redirect({ to: '/sign-in' })
  },
  component: () => null, // Nunca renderiza - sempre redireciona no beforeLoad
})
