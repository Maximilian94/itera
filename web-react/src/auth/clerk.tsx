import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react'
// import { default } from '@clerk/themes'
import { ptBR } from '@clerk/localizations'
import type { Appearance as ClerkAppearance, UserResource } from '@clerk/types'
import colors from 'tailwindcss/colors'
import tailwindConfig from 'tailwindcss/defaultTheme'
import React from 'react'

const clerkAppearance:ClerkAppearance = {
  variables: {
    colorPrimary: colors.cyan[600] ?? '',
    colorBackground: colors.slate[50] ?? '', // slate-800 - card destacado sobre slate-900
    colorSuccess: colors.emerald[600] ?? '', // emerald-600
    colorWarning: colors.amber[600] ?? '', // amber-600
    borderRadius: tailwindConfig.borderRadius.lg,
  },
  layout: {
    logoImageUrl: '/logo.jpg',
    termsPageUrl: import.meta.env.VITE_PUBLIC_SITE_URL
      ? `${import.meta.env.VITE_PUBLIC_SITE_URL}/termos-de-uso`
      : 'https://maximizeenfermagem.com.br/termos-de-uso',
    privacyPageUrl: import.meta.env.VITE_PUBLIC_SITE_URL
      ? `${import.meta.env.VITE_PUBLIC_SITE_URL}/politica-de-privacidade`
      : 'https://maximizeenfermagem.com.br/politica-de-privacidade',
  },
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

export type ClerkAuth = {
  isAuthenticated: boolean
  user: UserResource | null
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
}

export function useClerkAuth(): ClerkAuth {
  const { isSignedIn, isLoaded } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  return {
    isAuthenticated: isSignedIn ?? false,
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: [
            {
              emailAddress: user.primaryEmailAddress?.emailAddress || '',
            },
          ],
        } as UserResource
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
