import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button, Typography } from '@mui/material'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: IndexPage,
})

function IndexPage() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-6">
      <Typography variant="h4">Itera</Typography>
      <Typography variant="body1" color="textSecondary">
        Sign in or create an account to continue.
      </Typography>
      <div className="flex gap-4">
        <Button component={Link} to="/sign-in" variant="contained">
          Sign in
        </Button>
        <Button component={Link} to="/sign-up" variant="outlined">
          Sign up
        </Button>
      </div>
    </div>
  )
}
