import {
  ArrowTrendingUpIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline'
import type { Appearance as ClerkAppearance } from '@clerk/types'

interface AuthLayoutProps {
  children: React.ReactNode
}

const highlights = [
  {
    icon: DevicePhoneMobileIcon,
    title: 'Fluxo mobile-first',
    description: 'Entre e continue seus estudos sem depender de uma tela grande.',
  },
  {
    icon: BoltIcon,
    title: 'Sessões rápidas',
    description: 'Volte para provas e treinos com menos atrito entre um bloco e outro.',
  },
  {
    icon: ArrowTrendingUpIcon,
    title: 'Evolução visível',
    description: 'Acompanhe seu ritmo e transforme tentativas em retenção real.',
  },
] as const

export const authFormAppearance: ClerkAppearance = {
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full',
    card: 'w-full rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-2xl shadow-slate-950/10 sm:px-6 sm:py-6',
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
    formFieldInputShowPasswordButton:
      'text-slate-400 hover:text-slate-600',
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.18),transparent_30%)]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-stretch lg:gap-6 lg:px-8">
        <section
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 text-white backdrop-blur sm:p-8 lg:flex lg:w-[42%] lg:flex-col lg:justify-between"
          style={{ animation: 'fade-in-up 0.5s ease-out both' }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-white/6 via-transparent to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <img
                src="/logo.jpg"
                alt="Itera"
                className="h-11 w-11 rounded-xl object-cover"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                  Itera
                </p>
                <p className="text-sm font-semibold text-white">
                  Estudo guiado, também no celular
                </p>
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Seu estudo precisa funcionar no bolso, não só no desktop.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Faça login, retome provas, acompanhe treinos e mantenha a rotina
              viva mesmo em sessões curtas.
            </p>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {highlights.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.08] p-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>

          <p className="relative mt-6 text-xs uppercase tracking-[0.18em] text-slate-400">
            Perfeição vem de tentativas inteligentes.
          </p>
        </section>

        <section
          className="flex flex-1 items-center justify-center"
          style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
        >
          <div className="w-full max-w-lg">{children}</div>
        </section>
      </div>
    </div>
  )
}
