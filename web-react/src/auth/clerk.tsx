import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import React from 'react'

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  )
}

export function useClerkAuth() {
  const { isSignedIn, isLoaded } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  return {
    isAuthenticated: isSignedIn,
    user: user
      ? {
          id: user.id,
          username:
            user.username || user.primaryEmailAddress?.emailAddress || '',
          email: user.primaryEmailAddress?.emailAddress || '',
        }
      : null,
    isLoading: !isLoaded,
    login: () => {
      window.location.href = '/sign-in'
    },
    logout: async () => {
      await signOut()
      window.location.href = '/'
    },
  }
}
