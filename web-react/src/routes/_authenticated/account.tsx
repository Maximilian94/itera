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
  CheckCircleIcon,
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

function getCheckoutUrls() {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : ''
  return {
    successUrl: `${origin}/checkout-success`,
    cancelUrl: `${origin}/account`,
  }
}

function formatDateBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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
  const [cancellingTrial, setCancellingTrial] = useState(false)

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

  const handleBuyClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const { successUrl, cancelUrl } = getCheckoutUrls()
      const { url } = await stripeService.createCheckoutSession({
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
        } else if (err.status === 404 || err.status === 501) {
          setError('Checkout em configuração. Tente novamente em breve.')
        } else {
          setError(err.message || 'Erro ao iniciar checkout.')
        }
      } else {
        setError('Erro ao conectar. Verifique sua conexão.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTrial = () => {
    setCancellingTrial(true)
    // TODO: chamar API para cancelar trial quando existir
    setTimeout(() => {
      setCancellingTrial(false)
      alert('Cancelamento de trial em breve será feito pela API.')
    }, 500)
  }

  return (
    <div className="flex flex-col gap-8 p-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Conta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acesso à plataforma e preferências da sua conta.
        </p>
      </div>

      {/* Seção: Perfil (dados básicos) */}
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
            O telefone é obrigatório para comprar acesso. Também usamos para entrar em contato em caso de reembolso (ex.: pedido de feedback).
          </p>
        </Card>
      </section>

      {/* Seção: Acesso */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-slate-600" />
          Acesso
          {isMock && (
            <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Modo teste (?access=active|trial|inactive)
            </span>
          )}
        </h2>
        {accessLoading ? (
          <Card noElevation className="p-6 max-w-lg">
            <p className="text-sm text-slate-500">Carregando status de acesso…</p>
          </Card>
        ) : (
          <>
            <AccessCard
              access={access}
              error={error}
              loading={loading}
              cancellingTrial={cancellingTrial}
              onBuyClick={handleBuyClick}
              onCancelTrial={handleCancelTrial}
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

      {/* Espaço para outras seções no futuro (reembolso, etc.) */}
    </div>
  )
}

function AccessCard({
  access,
  error,
  loading,
  cancellingTrial,
  onBuyClick,
  onCancelTrial,
}: {
  access: AccessState
  error: string | null
  loading: boolean
  cancellingTrial: boolean
  onBuyClick: () => void
  onCancelTrial: () => void
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
                Ativo
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                Seu acesso está ativo
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Válido até {formatDateBR(access.accessExpiresAt)} ·{' '}
                <strong className="text-slate-700">{access.daysLeft} dias</strong>{' '}
                restantes
              </p>
            </div>
          </div>
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
                Trial
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                Período de teste
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                <strong className="text-slate-700">{access.daysLeftInTrial} dias</strong>{' '}
                restantes no trial (até {formatDateBR(access.trialEndsAt)}). Após isso,
                assine para continuar.
              </p>
            </div>
          </div>
          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            disabled={cancellingTrial}
            onClick={onCancelTrial}
          >
            {cancellingTrial ? 'Cancelando…' : 'Cancelar trial'}
          </Button>
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
              Não ativo
            </span>
            <h3 className="text-lg font-semibold text-slate-900">
              Acesso Itera – 1 ano
            </h3>
            <p className="text-sm text-slate-500">
              Acesso completo à plataforma por 12 meses.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            role="alert"
          >
            {error}
          </div>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={loading}
          onClick={onBuyClick}
          startIcon={<CreditCardIcon className="w-5 h-5" />}
          fullWidth
        >
          {loading ? 'Redirecionando…' : 'Comprar acesso (1 ano)'}
        </Button>

        <p className="text-xs text-slate-500">
          Você será redirecionado ao ambiente seguro de pagamento. Em até 7 dias
          você pode solicitar reembolso sem justificativa (direito de
          arrependimento).
        </p>
      </div>
    </Card>
  )
}
