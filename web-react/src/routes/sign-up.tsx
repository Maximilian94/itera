import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'
import { AuthLayout } from '@/components/AuthLayout'

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
