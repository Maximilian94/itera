import { Link } from '@tanstack/react-router'
import { Button, CircularProgress } from '@mui/material'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { authService } from '@/features/auth/services/auth.service'
import { useOpenPortal } from '@/features/stripe/hooks/useOpenPortal'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'

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
  const shouldCheckAdminBypass =
    !isLoading &&
    ((type === 'prova' && !hasAccess) ||
      (type === 'treino' && trainingBlockedMessage != null))
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
    enabled: shouldCheckAdminBypass,
  })
  const isAdmin = profileData?.user?.role === 'ADMIN'

  if (isLoading || (shouldCheckAdminBypass && profileLoading)) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6">
        <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-sm">
          <CircularProgress size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">
              Verificando acesso
            </span>
            <span className="text-xs text-slate-500">
              Preparando o conteudo da pagina.
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isAdmin) return <>{children}</>

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
