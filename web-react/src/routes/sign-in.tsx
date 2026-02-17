import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'
import { AuthLayout } from '@/components/AuthLayout'

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
          appearance={{
            elements: {
              rootBox: 'w-full',
              cardBox: 'w-full',
              card: 'w-full',
            },
          }}
        />
      </div>
    </AuthLayout>
  )
}
