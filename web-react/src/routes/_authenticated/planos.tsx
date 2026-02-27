import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@mui/material'
import {
  CheckIcon,
  SparklesIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { stripeService } from '@/features/stripe/services/stripe.service'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { ApiError } from '@/lib/api'
import type { PlanInfo, SubscriptionPlan } from '@/features/stripe/domain/stripe.types'

export const Route = createFileRoute('/_authenticated/planos')({
  component: PlanosPage,
})

/** Icon per plan to display on the card. */
const PLAN_ICONS: Record<SubscriptionPlan, React.ComponentType<{ className?: string }>> = {
  ESSENCIAL: AcademicCapIcon,
  ESTRATEGICO: SparklesIcon,
  ELITE: RocketLaunchIcon,
}

/** Formats cents to Brazilian currency (e.g. 4990 → "R$ 49.90"). */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/** Returns the success/cancel URLs for checkout. */
function getCheckoutUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    successUrl: `${origin}/checkout-success`,
    cancelUrl: `${origin}/planos`,
  }
}

function PlanosPage() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const { access } = useAccessState()

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['stripe', 'plans'],
    queryFn: () => stripeService.getPlans(),
    staleTime: 5 * 60_000,
  })

  const handleSubscribeNew = async (plan: PlanInfo) => {
    setError(null)
    setLoadingPlan(plan.plan)
    try {
      const priceId = billingInterval === 'month' ? plan.monthlyPriceId : plan.yearlyPriceId
      if (!priceId) {
        setError('Preço não disponível para este plano.')
        return
      }

      const { successUrl, cancelUrl } = getCheckoutUrls()
      const { url } = await stripeService.createCheckoutSession({
        priceId,
        successUrl,
        cancelUrl,
      })
      if (url) {
        window.location.href = url
        return
      }
      setError('Resposta inválida do servidor.')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.body && typeof err.body === 'object' && 'message' in err.body) {
          setError(String((err.body as { message: string }).message))
        } else {
          setError(err.message || 'Erro ao processar. Tente novamente.')
        }
      } else {
        setError('Erro ao conectar. Verifique sua conexão.')
      }
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleOpenPortal = async () => {
    setError(null)
    setPortalLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { url } = await stripeService.createCustomerPortal({
        returnUrl: `${origin}/planos`,
      })
      if (url) window.location.href = url
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erro ao abrir portal.')
      } else {
        setError('Erro ao conectar.')
      }
    } finally {
      setPortalLoading(false)
    }
  }

  const isActive = access.status === 'active' || access.status === 'trial'
  const currentPlan = access.status !== 'inactive' ? access.plan : null
  const currentInterval = isActive ? (access.billingInterval ?? 'month') : 'month'

  // Ao carregar, seleciona automaticamente o intervalo do plano atual (ex: anual se plano é anual)
  const hasInitializedInterval = useRef(false)
  useEffect(() => {
    if (isActive && currentInterval && !hasInitializedInterval.current) {
      setBillingInterval(currentInterval)
      hasInitializedInterval.current = true
    }
  }, [isActive, currentInterval])

  return (
    <div className="flex flex-col items-center gap-8 p-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Escolha seu plano
        </h1>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto">
          Estude para concursos com provas reais, explicações detalhadas e treinos inteligentes guiados por IA.
        </p>
      </div>

      {/* Toggle Mensal / Anual */}
      <div className="flex items-center gap-1 bg-slate-200 rounded-full p-1">
        <button
          onClick={() => setBillingInterval('month')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            billingInterval === 'month'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingInterval('year')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            billingInterval === 'year'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Anual
          <span className="ml-1.5 text-xs text-green-600 font-semibold">
            Economize
          </span>
        </button>
      </div>

      {/* Active user: Gerenciar via Portal */}
      {isActive && (
        <div className="w-full max-w-2xl bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-4">
          <p className="text-sm text-cyan-800 mb-3">
            Você já possui uma assinatura ativa. Para alterar seu plano, forma de cobrança ou método de pagamento, use o portal do Stripe.
          </p>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenPortal}
            disabled={portalLoading}
          >
            {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 max-w-md text-center">
          {error}
        </div>
      )}

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="text-slate-500 py-12">Carregando planos…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {(plans ?? []).map((plan) => {
            const isPopular = plan.plan === 'ESTRATEGICO'
            const isCurrent = currentPlan === plan.plan && currentInterval === billingInterval
            const Icon = PLAN_ICONS[plan.plan]
            const price = billingInterval === 'month' ? plan.monthlyAmount : plan.yearlyAmount
            const monthlyEquivalent = billingInterval === 'year' ? Math.round(plan.yearlyAmount / 12) : plan.monthlyAmount

            return (
              <div
                key={plan.plan}
                className={`relative flex flex-col rounded-2xl border-2 p-6 transition-shadow ${
                  isPopular
                    ? 'border-cyan-500 shadow-lg shadow-cyan-100'
                    : 'border-slate-200 hover:shadow-md'
                } ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full">
                    Mais Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                    Plano Atual
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPopular ? 'bg-cyan-100' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${isPopular ? 'text-cyan-600' : 'text-slate-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {formatCurrency(billingInterval === 'month' ? price : monthlyEquivalent)}
                    </span>
                    <span className="text-slate-500 text-sm">/mês</span>
                  </div>
                  {billingInterval === 'year' && (
                    <p className="text-xs text-slate-500 mt-1">
                      {formatCurrency(price)} cobrado anualmente
                    </p>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckIcon className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isPopular ? 'text-cyan-500' : 'text-green-500'
                      }`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full min-h-[48px] flex items-center justify-center">
                    <span className="inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      Plano atual
                    </span>
                  </div>
                ) : (
                  <Button
                    variant={isPopular ? 'contained' : 'outlined'}
                    color={isPopular ? 'primary' : 'inherit'}
                    size="large"
                    fullWidth
                    disabled={loadingPlan !== null || (isActive && portalLoading)}
                    onClick={() => (isActive ? handleOpenPortal() : handleSubscribeNew(plan))}
                  >
                    {loadingPlan === plan.plan
                      ? 'Processando…'
                      : isActive
                        ? portalLoading
                          ? 'Abrindo…'
                          : 'Gerenciar assinatura'
                        : 'Assinar'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Competitor Comparison Table */}
      <ComparisonTable />

      {/* Footer note */}
      <p className="text-xs text-slate-400 text-center max-w-md">
        Você será redirecionado ao ambiente seguro de pagamento do Stripe.
        Em até 7 dias você pode solicitar reembolso sem justificativa
        (direito de arrependimento — CDC Art. 49).
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Competitor Comparison Table
// ---------------------------------------------------------------------------

type SupportLevel = 'yes' | 'no' | 'partial'

interface ComparisonRow {
  feature: string
  qconcursos: SupportLevel
  aprova: SupportLevel
  estrategia: SupportLevel
  itera: SupportLevel
  partialNotes?: Partial<Record<'qconcursos' | 'aprova' | 'estrategia' | 'itera', string>>
}

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'Provas de concursos reais', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Explicações das alternativas', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Estatísticas de desempenho', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Diagnóstico automático após prova', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
  {
    feature: 'Identificação inteligente de pontos fracos',
    qconcursos: 'partial', aprova: 'partial', estrategia: 'partial', itera: 'yes',
    partialNotes: { qconcursos: 'Básico (por matéria)', aprova: 'Básico', estrategia: 'Manual' },
  },
  { feature: 'Plano de estudo personalizado', qconcursos: 'no', aprova: 'no', estrategia: 'partial', itera: 'yes', partialNotes: { estrategia: 'Manual (via trilhas/cursos)' } },
  { feature: 'Exercícios baseados nos seus erros', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
  { feature: 'Ciclo de reavaliação inteligente', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
]

function SupportIcon({ level, note }: { level: SupportLevel; note?: string }) {
  if (level === 'yes') return <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
  if (level === 'partial') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
        {note && <span className="text-[10px] text-amber-600 leading-tight text-center">{note}</span>}
      </div>
    )
  }
  return <XMarkIcon className="w-5 h-5 text-slate-300 mx-auto" />
}

function ComparisonTable() {
  const competitors = ['qconcursos', 'aprova', 'estrategia', 'itera'] as const
  const headers: Record<(typeof competitors)[number], string> = {
    qconcursos: 'QConcursos',
    aprova: 'Aprova Concursos',
    estrategia: 'Estratégia Concursos',
    itera: 'Itera',
  }

  return (
    <div className="w-full mt-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Por que o Itera?</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Compare as funcionalidades com as principais plataformas do mercado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Funcionalidade</th>
              {competitors.map((c) => (
                <th
                  key={c}
                  className={`px-3 py-3 font-semibold text-center min-w-[110px] ${
                    c === 'itera' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600'
                  }`}
                >
                  {headers[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_DATA.map((row, i) => (
              <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-4 py-3 text-slate-700 font-medium">{row.feature}</td>
                {competitors.map((c) => (
                  <td key={c} className={`px-3 py-3 ${c === 'itera' ? 'bg-cyan-50/50' : ''}`}>
                    <SupportIcon level={row[c]} note={row.partialNotes?.[c]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
