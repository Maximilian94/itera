import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'
import { AuthLayout, authFormAppearance } from '@/components/AuthLayout'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <AuthLayout>
      <div className="flex justify-center w-full">
        <SignUp
          redirectUrl="/dashboard"
          signInUrl="/sign-in"
          appearance={authFormAppearance}
        />
      </div>
    </AuthLayout>
  )
}
