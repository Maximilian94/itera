import { Link, useRouter } from '@tanstack/react-router'
import {
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassCircleIcon,
} from '@heroicons/react/24/outline'
import { useClerkAuth } from '@/auth/clerk'

/**
 * Página 404 com boa UX/UI.
 * Mensagem amigável, ações claras e design consistente com o app.
 */
export function NotFound() {
  const router = useRouter()
  const { isAuthenticated } = useClerkAuth()

  const primaryDestination = isAuthenticated ? '/dashboard' : '/'
  const primaryLabel = isAuthenticated ? 'Ir para o Dashboard' : 'Ir para o início'

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Decoração de fundo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-slate-700/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        {/* Ícone/Ilustração 404 */}
        <div
          className="mb-6 flex items-center justify-center"
          style={{ animation: 'fade-in-up 0.5s ease-out both' }}
        >
          <div className="relative">
            <div className="text-[8rem] font-bold text-slate-300 leading-none tracking-tighter select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <MagnifyingGlassCircleIcon className="w-16 h-16 text-cyan-500/70" />
            </div>
          </div>
        </div>

        {/* Título e descrição */}
        <h1
          className="text-2xl font-semibold text-sky-900 mb-2"
          style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
        >
          Página não encontrada
        </h1>
        <p
          className="text-slate-500 text-base leading-relaxed mb-8"
          style={{ animation: 'fade-in-up 0.5s ease-out 150ms both' }}
        >
          Ops! A página que você procura não existe ou foi movida.
          Verifique o endereço ou volte para uma página conhecida.
        </p>

        {/* Ações */}
        <div
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          style={{ animation: 'fade-in-up 0.5s ease-out 200ms both' }}
        >
          <Link
            to={primaryDestination}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-lg shadow-cyan-900/30"
          >
            <HomeIcon className="w-5 h-5" />
            {primaryLabel}
          </Link>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 font-medium transition-colors shadow-sm"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Voltar
          </button>
        </div>

        {/* Link secundário para sign-in se não autenticado */}
        {!isAuthenticated && (
          <p
            className="mt-8 text-sm text-slate-500"
            style={{ animation: 'fade-in-up 0.5s ease-out 250ms both' }}
          >
            Já tem conta?{' '}
            <Link to="/sign-in" className="text-cyan-600 hover:text-cyan-500 underline underline-offset-2">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
