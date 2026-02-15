import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { Link } from '@tanstack/react-router'
import { Button } from '@mui/material'
import { LockClosedIcon } from '@heroicons/react/24/outline'

/**
 * Gate component that displays an "access required" overlay when the user
 * does not have an active subscription, instead of rendering the children.
 *
 * @param type - Resource type ('prova' | 'treino') to customize the message.
 * @param children - Content to render when the user has access.
 *
 * @example
 * ```tsx
 * <AccessGate type="treino">
 *   <TrainingContent />
 * </AccessGate>
 * ```
 */
export function AccessGate({
  type,
  children,
}: {
  type: 'prova' | 'treino'
  children: React.ReactNode
}) {
  const { hasAccess, trainingBlockedMessage, isLoading } = useRequireAccess()

  if (isLoading) return null

  // Para treinos, verificar se o plano permite
  if (type === 'treino' && trainingBlockedMessage) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {hasAccess ? 'Treinos não disponíveis' : 'Assinatura necessária'}
        </h2>
        <p className="text-sm text-slate-500">
          {trainingBlockedMessage}
        </p>
        <Link to="/planos">
          <Button variant="contained" color="primary" size="large">
            {hasAccess ? 'Ver planos para upgrade' : 'Ver planos'}
          </Button>
        </Link>
      </div>
    )
  }

  // For exams, only check if user has access
  if (type === 'prova' && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Assinatura necessária
        </h2>
        <p className="text-sm text-slate-500">
          Assine um plano para fazer provas, acessar explicações e acompanhar seu progresso.
        </p>
        <Link to="/planos">
          <Button variant="contained" color="primary" size="large">
            Ver planos
          </Button>
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
