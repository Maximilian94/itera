import { Card } from '@/components/Card'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CheckCircleIcon,
  SparklesIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  HomeIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import type { SubscriptionPlan } from '@/features/stripe/domain/stripe.types'

export const Route = createFileRoute('/_authenticated/checkout-success')({
  component: CheckoutSuccessPage,
})

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  ESSENCIAL: 'Essencial',
  ESTRATEGICO: 'Estratégico',
  ELITE: 'Elite',
}

const PLAN_ICONS: Record<SubscriptionPlan, React.ComponentType<{ className?: string }>> = {
  ESSENCIAL: AcademicCapIcon,
  ESTRATEGICO: SparklesIcon,
  ELITE: RocketLaunchIcon,
}

/**
 * Página exibida após o checkout bem-sucedido no Stripe.
 * Confirma a assinatura ou a alteração de plano.
 */
function CheckoutSuccessPage() {
  const queryClient = useQueryClient()
  const { access, isLoading: accessLoading } = useAccessState()

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const planChange = params.get('planChange') === '1' || params.get('planChange') === 'true'

  // Garante dados frescos após o redirect do Stripe
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['stripe', 'access'] })
  }, [queryClient])

  const planName =
    access.status !== 'inactive' ? PLAN_NAMES[access.plan as SubscriptionPlan] : null
  const PlanIcon = planName && access.status !== 'inactive'
    ? PLAN_ICONS[access.plan]
    : SparklesIcon

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-8">
        {/* Header com animação */}
        <header className="text-center animate-[fade-in-up_0.6s_ease-out]">
          <div
            className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-emerald-400 to-green-600 shadow-lg shadow-green-200/60 mb-6 animate-[scale-in_0.5s_ease-out_0.2s_both]"
            aria-hidden
          >
            <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {planChange ? 'Plano alterado com sucesso!' : 'Assinatura confirmada!'}
          </h1>
          <p className="text-slate-600 mt-2 text-base sm:text-lg max-w-md mx-auto">
            {planChange
              ? 'Sua alteração de plano foi concluída. Você já pode aproveitar todos os recursos.'
              : 'Obrigado por fazer parte do Itera. Sua jornada de estudos começa agora.'}
          </p>
        </header>

        {/* Card principal */}
        <Card
          noElevation
          className="w-full p-6 sm:p-8 border-2 border-green-100 bg-linear-to-b from-white to-emerald-50/30 animate-[fade-in-up_0.6s_ease-out_0.15s_both]"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Plano ativo */}
            {!accessLoading && planName && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 border border-emerald-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <PlanIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Plano ativo
                  </p>
                  <p className="text-lg font-bold text-slate-900">{planName}</p>
                </div>
              </div>
            )}

            {accessLoading && (
              <div className="h-14 w-32 rounded-lg bg-slate-100 animate-pulse" aria-hidden />
            )}

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {planChange ? 'Seu novo plano está ativo!' : 'Sua assinatura está ativa!'}
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Você já pode usar todos os recursos do seu plano — provas reais, treinos
                inteligentes e diagnóstico automático.
              </p>
            </div>

            {/* CDC */}
            {!planChange && (
              <div className="w-full text-left px-4 py-3 rounded-lg bg-slate-50/80 border border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Em até 7 dias você pode solicitar reembolso sem justificativa (direito de
                  arrependimento — CDC Art. 49).
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link to="/dashboard">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<ArrowRightIcon className="w-5 h-5" />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  Ir para o Dashboard
                </Button>
              </Link>
              <Link to="/account" search={{ access: undefined }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  startIcon={<HomeIcon className="w-5 h-5" />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2,
                    borderColor: 'rgb(203 213 225)',
                    color: 'rgb(51 65 85)',
                    '&:hover': {
                      borderColor: 'rgb(148 163 184)',
                      backgroundColor: 'rgb(248 250 252)',
                    },
                  }}
                >
                  Ver minha conta
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Dica rápida */}
        <p className="text-sm text-slate-500 text-center animate-[fade-in-up_0.6s_ease-out_0.3s_both]">
          Dica: comece fazendo uma prova para receber seu diagnóstico personalizado.
        </p>
      </div>
    </div>
  )
}
