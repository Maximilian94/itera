import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { isAuthenticated, setAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: App,
})

function App() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 8 && !submitting
  }, [email, password, submitting])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await apiFetch<{ token: string; user: { id: string; email: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      )
      setAuthToken(res.token)
      await navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <Paper elevation={2} className="w-full max-w-md p-6">
        <Box className="flex flex-col gap-2 mb-4">
          <Typography variant="h4">Login</Typography>
          <Typography variant="body2" color="textSecondary">
            Sign in to continue.
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            helperText="Minimum 8 characters."
          />

          <Button type="submit" variant="contained" disabled={!canSubmit} fullWidth>
            {submitting ? (
              <span className="flex items-center gap-2">
                <CircularProgress size={18} />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Paper>
    </div>
  )
}
