import { AcademicCapIcon } from '@heroicons/react/24/outline'

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Layout compartilhado para páginas de autenticação (sign-in, sign-up).
 * Usa as cores da aplicação Itera: slate-900, emerald accents.
 * O formulário Clerk é renderizado dentro do card.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4 py-8">
      {/* Decoração de fundo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-slate-700/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo / Brand */}
        {/* <div
          className="flex items-center gap-3 mb-6"
          style={{ animation: 'fade-in-up 0.5s ease-out both' }}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <AcademicCapIcon className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-50 tracking-tight">
            Itera
          </span>
        </div> */}

        {/* Conteúdo (Clerk SignIn/SignUp) */}
        <div
          className="w-full"
          style={{
            animation: 'fade-in-up 0.5s ease-out 100ms both',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-xs text-slate-500"
          style={{ animation: 'fade-in-up 0.5s ease-out 200ms both' }}
        >
          Perfeição vem de tentativas inteligentes.
        </p>
      </div>
    </div>
  )
}
