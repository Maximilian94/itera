import { useUser } from '@clerk/clerk-react'
import { Card } from '@/components/Card'
import { authService } from '@/features/auth/services/auth.service'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { stripeService } from '@/features/stripe/services/stripe.service'
import type { AccessState } from '@/features/stripe/domain/stripe.types'
import { ApiError } from '@/lib/api'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Button, TextField } from '@mui/material'
import {
  CreditCardIcon,
  UserCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

export const Route = createFileRoute('/_authenticated/account')({
  validateSearch: (search: Record<string, unknown>) => ({
    access: typeof search.access === 'string' ? search.access : undefined,
  }),
  component: AccountPage,
})

/** Formata data ISO para formato brasileiro (dd/mm/aaaa). */
function formatDateBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Mapeia o nome do plano para exibição. */
function planDisplayName(plan: string): string {
  const names: Record<string, string> = {
    ESSENCIAL: 'Essencial',
    ESTRATEGICO: 'Estratégico',
    ELITE: 'Elite',
  }
  return names[plan] ?? plan
}

function AccountPage() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })
  const profile = profileData?.user ?? null
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneMessage, setPhoneMessage] = useState<'success' | 'error' | null>(null)
  useEffect(() => {
    setPhoneValue(profile?.phone ?? '')
  }, [profile?.phone])

  const { access, isLoading: accessLoading, isMock } = useAccessState()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const handleSavePhone = async () => {
    setPhoneMessage(null)
    setPhoneSaving(true)
    try {
      await authService.updatePhone(phoneValue.trim() || null)
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
      setPhoneMessage('success')
    } catch {
      setPhoneMessage('error')
    } finally {
      setPhoneSaving(false)
    }
  }

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    '—'
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? '—'

  /** Abre o Customer Portal do Stripe para gerenciar a assinatura. */
  const handleManageSubscription = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const { url } = await stripeService.createCustomerPortal({
        returnUrl: window.location.href,
      })
      window.location.href = url
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erro ao abrir portal de assinatura.')
      } else {
        setError('Erro ao conectar.')
      }
      setPortalLoading(false)
    }
  }

  /** Solicita reembolso CDC (7 dias). */
  const handleRequestRefund = async (purchaseId: string) => {
    setLoading(true)
    setError(null)
    try {
      await stripeService.requestRefund(purchaseId)
      queryClient.invalidateQueries({ queryKey: ['stripe', 'access'] })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erro ao solicitar reembolso.')
      } else {
        setError('Erro ao conectar.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Conta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acesso à plataforma e preferências da sua conta.
        </p>
      </div>

      {/* Seção: Perfil */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-slate-600" />
          Perfil
        </h2>
        <Card noElevation className="p-6 max-w-lg">
          <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-500 font-medium">Nome</dt>
            <dd className="text-slate-900">{displayName}</dd>
            <dt className="text-slate-500 font-medium">Email</dt>
            <dd className="text-slate-900">{displayEmail}</dd>
            <dt className="text-slate-500 font-medium">Telefone</dt>
            <dd className="text-slate-900">
              {profileLoading ? (
                <span className="text-slate-400">Carregando…</span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <TextField
                    size="small"
                    placeholder="Ex.: (11) 99999-9999"
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    disabled={phoneSaving}
                    sx={{ minWidth: 200 }}
                    inputProps={{ 'aria-label': 'Telefone' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={phoneSaving}
                    onClick={handleSavePhone}
                  >
                    {phoneSaving ? 'Salvando…' : 'Salvar'}
                  </Button>
                  {phoneMessage === 'success' && (
                    <span className="text-xs text-green-600">Salvo.</span>
                  )}
                  {phoneMessage === 'error' && (
                    <span className="text-xs text-red-600">Erro ao salvar.</span>
                  )}
                </div>
              )}
            </dd>
          </dl>
          <p className="text-xs text-slate-500 mt-3">
            O telefone é obrigatório para assinar. Também usamos para entrar em contato em caso de reembolso.
          </p>
        </Card>
      </section>

      {/* Seção: Assinatura */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-slate-600" />
          Assinatura
          {isMock && (
            <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Modo teste (?access=active|trial|inactive)
            </span>
          )}
        </h2>
        {accessLoading ? (
          <Card noElevation className="p-6 max-w-lg">
            <p className="text-sm text-slate-500">Carregando status…</p>
          </Card>
        ) : (
          <>
            <AccessCard
              access={access}
              error={error}
              loading={loading}
              portalLoading={portalLoading}
              onManageSubscription={handleManageSubscription}
              onRequestRefund={handleRequestRefund}
            />
            {isMock && (
              <p className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-2 gap-y-1">
                Testar:
                <Link to="/account" search={{ access: 'active' }} className="text-blue-600 hover:underline">Ativo</Link>
                <span className="text-slate-300">|</span>
                <Link to="/account" search={{ access: 'trial' }} className="text-blue-600 hover:underline">Trial</Link>
                <span className="text-slate-300">|</span>
                <Link to="/account" search={{ access: 'inactive' }} className="text-blue-600 hover:underline">Não ativo</Link>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/**
 * Card que exibe o estado da assinatura do usuário:
 * - Ativo: plano, período, treinos usados, botão gerenciar.
 * - Trial: mesma info + aviso de período CDC e botão de reembolso.
 * - Inativo: CTA para assinar.
 */
function AccessCard({
  access,
  error,
  loading,
  portalLoading,
  onManageSubscription,
  onRequestRefund,
}: {
  access: AccessState
  error: string | null
  loading: boolean
  portalLoading: boolean
  onManageSubscription: () => void
  onRequestRefund: (purchaseId: string) => void
}) {
  if (access.status === 'active') {
    return (
      <Card noElevation className="p-6 max-w-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircleSolid className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <span className="inline-block text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded mb-1">
                Ativo — {planDisplayName(access.plan)}
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                Sua assinatura está ativa
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Renova em {formatDateBR(access.currentPeriodEnd)}
              </p>
            </div>
          </div>

          {/* Treinos usados */}
          {access.trainingLimit > 0 && (
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-sm text-slate-600">
                Treinos este mês:{' '}
                <strong className="text-slate-900">
                  {access.trainingsUsedThisMonth}/{access.trainingLimit}
                </strong>
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (access.trainingsUsedThisMonth / access.trainingLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {error}
            </div>
          )}

          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            disabled={portalLoading}
            onClick={onManageSubscription}
          >
            {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
          </Button>
        </div>
      </Card>
    )
  }

  if (access.status === 'trial') {
    return (
      <Card noElevation className="p-6 max-w-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClockIcon className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded mb-1">
                Trial — {planDisplayName(access.plan)}
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                Período de arrependimento (CDC)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Você pode cancelar e receber reembolso total até 7 dias após a compra.
                Renova em {formatDateBR(access.currentPeriodEnd)}.
              </p>
            </div>
          </div>

          {/* Treinos usados */}
          {access.trainingLimit > 0 && (
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-sm text-slate-600">
                Treinos este mês:{' '}
                <strong className="text-slate-900">
                  {access.trainingsUsedThisMonth}/{access.trainingLimit}
                </strong>
              </p>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outlined"
              color="inherit"
              size="medium"
              disabled={portalLoading}
              onClick={onManageSubscription}
            >
              {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
            </Button>
            {access.canRequestRefund && access.lastPurchaseId && (
              <Button
                variant="outlined"
                color="error"
                size="medium"
                disabled={loading}
                onClick={() => onRequestRefund(access.lastPurchaseId!)}
              >
                {loading ? 'Cancelando…' : 'Cancelar e reembolsar'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // inactive
  return (
    <Card noElevation className="p-6 max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
            <XCircleIcon className="w-7 h-7 text-slate-500" />
          </div>
          <div>
            <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded mb-1">
              Sem assinatura
            </span>
            <h3 className="text-lg font-semibold text-slate-900">
              Assine para acessar
            </h3>
            <p className="text-sm text-slate-500">
              Escolha um plano para ter acesso a provas, treinos e muito mais.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            {error}
          </div>
        )}

        <Link to="/planos">
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<CreditCardIcon className="w-5 h-5" />}
            fullWidth
          >
            Ver planos
          </Button>
        </Link>
      </div>
    </Card>
  )
}
