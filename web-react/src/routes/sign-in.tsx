import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'
import { AuthLayout, authFormAppearance } from '@/components/AuthLayout'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  return (
    <AuthLayout>
      <div className="flex justify-center w-full">
        <SignIn
          redirectUrl="/dashboard"
          signUpUrl="/sign-up"
          appearance={authFormAppearance}
        />
      </div>
    </AuthLayout>
  )
}
