import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@mui/material'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { stripeService } from '@/features/stripe/services/stripe.service'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { ApiError } from '@/lib/api'
import type { SubscriptionPlan } from '@/features/stripe/domain/stripe.types'

export const Route = createFileRoute('/_authenticated/gerenciar-assinatura')({
  component: GerenciarAssinaturaPage,
})

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  ESSENCIAL: 'Essencial',
  ESTRATEGICO: 'Estratégico',
  ELITE: 'Elite',
}

function GerenciarAssinaturaPage() {
  const { access, isLoading: accessLoading } = useAccessState()
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = access.status === 'active' || access.status === 'trial'
  const currentPlan = isActive ? access.plan : null
  const currentInterval = isActive ? (access.billingInterval ?? 'month') : 'month'

  const handleOpenPortal = async () => {
    setError(null)
    setPortalLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { url } = await stripeService.createCustomerPortal({
        returnUrl: `${origin}/gerenciar-assinatura`,
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

  // Redirect inactive users to planos
  if (!accessLoading && !isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-slate-900">Gerenciar assinatura</h1>
        <p className="text-slate-600 text-center">
          Você precisa de uma assinatura ativa para gerenciar seu plano.
        </p>
        <Link to="/planos">
          <Button variant="contained" color="primary" size="large">
            Ver planos
          </Button>
        </Link>
      </div>
    )
  }

  if (accessLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
        <p className="text-slate-500">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/account" search={{ access: undefined }}>
          <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Voltar
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gerenciar assinatura</h1>
        <p className="text-slate-600 mt-1">
          Altere seu plano, forma de cobrança ou método de pagamento pelo portal seguro do Stripe.
        </p>
      </div>

      {currentPlan && (
        <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
          <p className="text-sm font-medium text-slate-700">
            Plano atual: <span className="text-slate-900">{PLAN_NAMES[currentPlan]}</span>
            {' · '}
            <span className="text-slate-600">
              {currentInterval === 'year' ? 'Cobrança anual' : 'Cobrança mensal'}
            </span>
          </p>
          {access.status !== 'inactive' && 'scheduledPlan' in access && access.scheduledPlan && (
            <p className="text-sm text-amber-700 mt-2">
              Mudança agendada para{' '}
              {'scheduledChangeDate' in access && access.scheduledChangeDate
                ? new Date(access.scheduledChangeDate).toLocaleDateString('pt-BR')
                : 'próximo ciclo'}
              . Abra o portal para gerenciar.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
        <p className="text-sm text-blue-800 mb-3">
          No portal do Stripe você pode alterar seu plano, trocar entre cobrança mensal e anual,
          atualizar o método de pagamento e cancelar sua assinatura.
        </p>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenPortal}
          disabled={portalLoading}
        >
          {portalLoading ? 'Abrindo…' : 'Abrir portal de assinatura'}
        </Button>
      </div>
    </div>
  )
}
