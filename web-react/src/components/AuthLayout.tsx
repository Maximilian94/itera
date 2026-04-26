import type { Appearance as ClerkAppearance } from '@clerk/types'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const authFormAppearance: ClerkAppearance = {
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full',
    card: 'w-full rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-xl shadow-slate-950/10 sm:px-6 sm:py-6',
    header: 'space-y-2',
    headerTitle: 'text-2xl font-bold tracking-tight text-slate-900',
    headerSubtitle: 'text-sm leading-6 text-slate-500',
    socialButtonsBlockButton:
      'h-12 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-none transition-colors hover:bg-slate-50',
    socialButtonsBlockButtonText: 'text-sm font-semibold text-slate-700',
    dividerLine: 'bg-slate-200',
    dividerText:
      'bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400',
    formFieldLabel:
      'mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500',
    formFieldInput:
      'h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 shadow-none focus:border-cyan-500 focus:bg-white',
    formFieldInputShowPasswordButton: 'text-slate-400 hover:text-slate-600',
    formFieldAction: 'font-semibold text-cyan-700 hover:text-cyan-800',
    formButtonPrimary:
      'h-12 rounded-2xl bg-linear-to-r from-cyan-500 to-sky-600 text-sm font-semibold text-white shadow-lg shadow-cyan-900/25 transition-all hover:from-cyan-600 hover:to-sky-700',
    footer: 'pt-4',
    footerAction: 'text-sm text-slate-500',
    footerActionLink: 'font-semibold text-cyan-700 hover:text-cyan-800',
    formResendCodeLink: 'font-semibold text-cyan-700 hover:text-cyan-800',
    otpCodeFieldInput:
      'h-12 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-none',
    identityPreviewText: 'text-slate-700',
    identityPreviewEditButton:
      'font-semibold text-cyan-700 hover:text-cyan-800',
    formFieldSuccessText: 'text-emerald-700',
    formFieldWarningText: 'text-amber-700',
    alertText: 'text-sm',
    logoBox: 'hidden',
  },
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div
          className="w-full"
          style={{ animation: 'fade-in-up 0.5s ease-out both' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
