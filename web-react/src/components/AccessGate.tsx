import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { useOpenPortal } from '@/features/stripe/hooks/useOpenPortal'
import { Link } from '@tanstack/react-router'
import { Button } from '@mui/material'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'

/**
 * Gate component that displays an "access required" overlay when the user
 * does not have an active subscription or when their plan is insufficient,
 * instead of rendering the children.
 *
 * For trainings:
 * - Inactive/Essencial: Link to /planos
 * - Limit reached (non-Elite): "Fazer upgrade" → Stripe portal
 * - Limit reached (Elite): "Ver assinatura" → Stripe portal
 *
 * @param type - Resource type ('prova' | 'treino') to customize the message.
 * @param children - Content to render when the user has access.
 */
export function AccessGate({
  type,
  children,
}: {
  type: 'prova' | 'treino'
  children: React.ReactNode
}) {
  const {
    hasAccess,
    trainingBlockedMessage,
    isLoading,
    isBlockedByEssencial,
    isLimitReached,
    isEliteAtLimit,
  } = useRequireAccess()
  const { openPortal, loading: portalLoading } = useOpenPortal('/treino/novo')

  if (isLoading) return null

  // For trainings, check if the plan allows it or limit reached
  if (type === 'treino' && trainingBlockedMessage) {
    const usePortal = isLimitReached
    const nextMonthDate = dayjs().add(1, 'month').startOf('month').format('DD/MM/YYYY')

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto mt-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {isLimitReached
            ? 'Limite do mês atingido'
            : hasAccess
              ? 'Treinos não disponíveis no seu plano'
              : 'Assinatura necessária'}
        </h2>
        <p className="text-sm text-slate-500">
          {isLimitReached && isEliteAtLimit
            ? `Novos treinos disponíveis em ${nextMonthDate}.`
            : trainingBlockedMessage}
        </p>
        {usePortal ? (
          <Button
            variant="contained"
            color="primary"
            size="large"
            disabled={portalLoading}
            onClick={openPortal}
          >
            {portalLoading ? 'Abrindo…' : isEliteAtLimit ? 'Ver assinatura' : 'Fazer upgrade'}
          </Button>
        ) : (
          <Link to="/planos">
            <Button variant="contained" color="primary" size="large">
              {hasAccess || isBlockedByEssencial ? 'Fazer upgrade' : 'Ver planos'}
            </Button>
          </Link>
        )}
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
