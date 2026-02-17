import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react'
// import { default } from '@clerk/themes'
import { ptBR } from '@clerk/localizations'
import type { Appearance as ClerkAppearance } from '@clerk/types'
import colors from 'tailwindcss/colors'
import tailwindConfig from 'tailwindcss/defaultTheme'
import React from 'react'

const clerkAppearance:ClerkAppearance = {
  variables: {
    colorPrimary: colors.indigo[600] ?? '', // emerald-600
    colorBackground: colors.slate[50] ?? '', // slate-800 - card destacado sobre slate-900
    colorSuccess: colors.emerald[600] ?? '', // emerald-600
    colorWarning: colors.amber[600] ?? '', // amber-600
    borderRadius: tailwindConfig.borderRadius.lg,
  },
  layout: {
    logoImageUrl: '/logo.jpg',
  }
}

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      localization={ptBR}
    >
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
      window.location.href = '/sign-in'
    },
  }
}
