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
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  CreditCardIcon,
  UserCircleIcon,
  ClockIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  SparklesIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  Cog6ToothIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import type { SubscriptionPlan } from '@/features/stripe/domain/stripe.types'

export type AccountTab = 'perfil' | 'assinatura'

export const Route = createFileRoute('/_authenticated/account')({
  validateSearch: (search: Record<string, unknown>) => ({
    access: typeof search.access === 'string' ? search.access : undefined,
    tab: (search.tab === 'perfil' || search.tab === 'assinatura' ? search.tab : 'perfil') as AccountTab,
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

const PLAN_ICONS: Record<SubscriptionPlan, React.ComponentType<{ className?: string }>> = {
  ESSENCIAL: AcademicCapIcon,
  ESTRATEGICO: SparklesIcon,
  ELITE: RocketLaunchIcon,
}

/** Retorna iniciais do nome (ex: "João Silva" → "JS"). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function AccountPage() {
  const { tab, access: accessParam } = Route.useSearch()
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
    'Usuário'
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? '—'

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { url } = await stripeService.createCustomerPortal({
        returnUrl: `${origin}/account?tab=assinatura`,
      })
      if (url) window.location.href = url
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Erro ao abrir portal de assinatura.')
      } else {
        setError('Erro ao conectar.')
      }
      setPortalLoading(false)
    }
  }

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

  const searchForLinks = { access: accessParam, tab }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">
        {/* Submenu lateral - estilo "All settings" */}
        <aside className="lg:w-56 xl:w-64 shrink-0">
          <nav
            className="sticky top-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-[fade-in-up_0.4s_ease-out]"
            aria-label="Configurações da conta"
          >
            <h2 className="text-base font-bold text-slate-900 mb-5 px-2">
              Configurações
            </h2>

            <div className="space-y-5">
              {/* Seção Perfil */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Perfil
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      to="/account"
                      search={{ ...searchForLinks, tab: 'perfil' }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px] ${
                        tab === 'perfil'
                          ? 'border-l-blue-500 bg-blue-50/50 text-slate-900'
                          : 'border-l-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <UserCircleIcon className="w-5 h-5 text-slate-500 shrink-0" />
                      Dados pessoais
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Seção Assinatura */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Assinatura
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      to="/account"
                      search={{ ...searchForLinks, tab: 'assinatura' }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px] ${
                        tab === 'assinatura'
                          ? 'border-l-blue-500 bg-blue-50/50 text-slate-900'
                          : 'border-l-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <CreditCardIcon className="w-5 h-5 text-slate-500 shrink-0" />
                      Plano e pagamento
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 lg:pl-8">
          {tab === 'perfil' ? (
            <ProfileContent
              displayName={displayName}
              displayEmail={displayEmail}
              role={profile?.role}
              profileLoading={profileLoading}
              phoneValue={phoneValue}
              setPhoneValue={setPhoneValue}
              phoneSaving={phoneSaving}
              phoneMessage={phoneMessage}
              handleSavePhone={handleSavePhone}
              isMock={isMock}
            />
          ) : (
            <SubscriptionContent
              access={access}
              accessLoading={accessLoading}
              error={error}
              loading={loading}
              portalLoading={portalLoading}
              onManageSubscription={handleManageSubscription}
              onRequestRefund={handleRequestRefund}
              isMock={isMock}
              searchForLinks={searchForLinks}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function ProfileContent({
  displayName,
  displayEmail,
  role,
  profileLoading,
  phoneValue,
  setPhoneValue,
  phoneSaving,
  phoneMessage,
  handleSavePhone,
  isMock,
}: {
  displayName: string
  displayEmail: string
  role?: 'ADMIN' | 'USER'
  profileLoading: boolean
  phoneValue: string
  setPhoneValue: (v: string) => void
  phoneSaving: boolean
  phoneMessage: 'success' | 'error' | null
  handleSavePhone: () => void
  isMock: boolean
}) {
  return (
    <div className="animate-[fade-in-up_0.4s_ease-out_0.05s_both]">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-200/50">
            {getInitials(displayName)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dados pessoais
            </h1>
            <p className="text-slate-600 text-sm mt-0.5">
              Nome, email e telefone da sua conta
            </p>
          </div>
          {isMock && (
            <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              Modo teste
            </span>
          )}
        </div>
      </header>

      <Card noElevation className="p-6 sm:p-8 border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-5">
          <ProfileField icon={IdentificationIcon} label="Nome" value={displayName} />
          <ProfileField icon={EnvelopeIcon} label="Email" value={displayEmail} />
          <ProfileField
            icon={ShieldCheckIcon}
            label="Perfil"
            value={profileLoading ? '—' : (role === 'ADMIN' ? 'Administrador' : role === 'USER' ? 'Usuário' : '—')}
          />
          <div>
            <ProfileFieldLabel icon={PhoneIcon} label="Telefone" />
            {profileLoading ? (
              <div className="h-10 w-48 rounded-lg bg-slate-100 animate-pulse mt-1" />
            ) : (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <TextField
                  size="small"
                  placeholder="(11) 99999-9999"
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  disabled={phoneSaving}
                  sx={{
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgb(248 250 252)',
                    },
                  }}
                  inputProps={{ 'aria-label': 'Telefone' }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={phoneSaving}
                  onClick={handleSavePhone}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {phoneSaving ? 'Salvando…' : 'Salvar'}
                </Button>
                {phoneMessage === 'success' && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircleSolid className="w-4 h-4" /> Salvo
                  </span>
                )}
                {phoneMessage === 'error' && (
                  <span className="text-sm text-red-600 font-medium">Erro ao salvar</span>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
          O telefone é obrigatório para assinar. Também usamos para contato em caso de reembolso.
        </p>
      </Card>
    </div>
  )
}

function SubscriptionContent({
  access,
  accessLoading,
  error,
  loading,
  portalLoading,
  onManageSubscription,
  onRequestRefund,
  isMock,
  searchForLinks,
}: {
  access: AccessState
  accessLoading: boolean
  error: string | null
  loading: boolean
  portalLoading: boolean
  onManageSubscription: () => void
  onRequestRefund: (purchaseId: string) => void
  isMock: boolean
  searchForLinks: { access?: string; tab: AccountTab }
}) {
  return (
    <div className="animate-[fade-in-up_0.4s_ease-out_0.05s_both]">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Plano e pagamento
        </h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Gerencie sua assinatura, método de pagamento e reembolsos
        </p>
      </header>

      {accessLoading ? (
        <Card noElevation className="p-8 border border-slate-200/80 rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-48 rounded bg-slate-100 animate-pulse" />
          </div>
        </Card>
      ) : (
        <>
          <AccessCard
            access={access}
            error={error}
            loading={loading}
            portalLoading={portalLoading}
            onManageSubscription={onManageSubscription}
            onRequestRefund={onRequestRefund}
          />
          {(access.status === 'active' || access.status === 'trial') && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
              <p className="text-sm text-blue-800">
                Os botões acima redirecionam para o portal do Stripe, onde você pode alterar seu plano,
                trocar entre cobrança mensal e anual, atualizar o método de pagamento e cancelar sua assinatura.
              </p>
            </div>
          )}
          {isMock && (
            <p className="text-xs text-slate-500 mt-4 flex flex-wrap gap-x-2 gap-y-1 items-center">
              <span>Testar:</span>
              <Link to="/account" search={{ ...searchForLinks, access: 'active' }} className="text-blue-600 hover:underline font-medium">Ativo</Link>
              <span className="text-slate-300">|</span>
              <Link to="/account" search={{ ...searchForLinks, access: 'trial' }} className="text-blue-600 hover:underline font-medium">Trial</Link>
              <span className="text-slate-300">|</span>
              <Link to="/account" search={{ ...searchForLinks, access: 'inactive' }} className="text-blue-600 hover:underline font-medium">Não ativo</Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div>
      <ProfileFieldLabel icon={Icon} label={label} />
      <p className="text-slate-900 font-medium mt-1">{value}</p>
    </div>
  )
}

function ProfileFieldLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
      <Icon className="w-4 h-4" />
      {label}
    </div>
  )
}

/**
 * Card que exibe o estado da assinatura do usuário.
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
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  if (access.status === 'active') {
    const PlanIcon = PLAN_ICONS[access.plan]
    const billingLabel = access.billingInterval === 'year' ? 'Cobrança anual' : 'Cobrança mensal'
    return (
      <Card noElevation className="overflow-hidden border border-slate-200/80 rounded-2xl">
        <div className="p-6 sm:p-8">
          {/* Plano atual em destaque */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <PlanIcon className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Plano atual</p>
              <p className="text-lg font-bold text-slate-900">
                {planDisplayName(access.plan)} · {billingLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200/40">
                <CheckCircleSolid className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativo
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  Assinatura ativa
                </h3>
                <p className="text-slate-600 text-sm mt-0.5">
                  Renova em {formatDateBR(access.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          {access.scheduledPlan && access.scheduledChangeDate && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Mudança agendada para {formatDateBR(access.scheduledChangeDate)}.
                Abra o portal para gerenciar.
              </p>
            </div>
          )}

          {access.trainingLimit > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Treinos este mês</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {access.trainingsUsedThisMonth}/{access.trainingLimit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (access.trainingsUsedThisMonth / access.trainingLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Cog6ToothIcon className="w-5 h-5" />}
              disabled={portalLoading}
              onClick={onManageSubscription}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.5 }}
            >
              {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<BanknotesIcon className="w-5 h-5" />}
              disabled={portalLoading}
              onClick={onManageSubscription}
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                borderColor: 'rgb(203 213 225)',
                color: 'rgb(51 65 85)',
                '&:hover': { borderColor: 'rgb(148 163 184)', backgroundColor: 'rgb(248 250 252)' },
              }}
            >
              {portalLoading ? 'Abrindo…' : 'Atualizar pagamento'}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (access.status === 'trial') {
    const PlanIcon = PLAN_ICONS[access.plan]
    const billingLabel = access.billingInterval === 'year' ? 'Cobrança anual' : 'Cobrança mensal'
    return (
      <Card noElevation className="overflow-hidden border border-amber-200/80 rounded-2xl">
        <div className="p-6 sm:p-8 bg-linear-to-b from-amber-50/50 to-white">
          {/* Plano atual em destaque */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <PlanIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Plano atual</p>
              <p className="text-lg font-bold text-slate-900">
                {planDisplayName(access.plan)} · {billingLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200/40">
                <ClockIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  Período CDC
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  Período de arrependimento
                </h3>
                <p className="text-slate-600 text-sm mt-0.5">
                  Você pode cancelar e receber reembolso total até 7 dias. Renova em {formatDateBR(access.currentPeriodEnd)}.
                </p>
              </div>
            </div>
          </div>

          {access.scheduledPlan && access.scheduledChangeDate && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-amber-100/80 border border-amber-200 flex items-start gap-3">
              <ClockIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Mudança agendada para {formatDateBR(access.scheduledChangeDate)}.
              </p>
            </div>
          )}

          {access.trainingLimit > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-white/80 border border-amber-100">
              <p className="text-sm text-slate-600">
                Treinos este mês: <strong className="text-slate-900">{access.trainingsUsedThisMonth}/{access.trainingLimit}</strong>
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (access.trainingsUsedThisMonth / access.trainingLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Cog6ToothIcon className="w-5 h-5" />}
              disabled={portalLoading}
              onClick={onManageSubscription}
              fullWidth
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.5 }}
            >
              {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<BanknotesIcon className="w-5 h-5" />}
              disabled={portalLoading}
              onClick={onManageSubscription}
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                borderColor: 'rgb(203 213 225)',
                color: 'rgb(51 65 85)',
                '&:hover': { borderColor: 'rgb(148 163 184)', backgroundColor: 'rgb(248 250 252)' },
              }}
            >
              {portalLoading ? 'Abrindo…' : 'Atualizar pagamento'}
            </Button>
            {access.canRequestRefund && access.lastPurchaseId && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  startIcon={<XCircleIcon className="w-5 h-5" />}
                  disabled={loading}
                  onClick={() => setRefundDialogOpen(true)}
                  fullWidth
                  sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2 }}
                >
                  {loading ? 'Cancelando…' : 'Cancelar e reembolsar'}
                </Button>

                <Dialog
                  open={refundDialogOpen}
                  onClose={() => !loading && setRefundDialogOpen(false)}
                  maxWidth="sm"
                  fullWidth
                  PaperProps={{ sx: { borderRadius: 2 } }}
                >
                  <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem' }}>
                    Tem certeza que deseja cancelar?
                  </DialogTitle>
                  <DialogContent>
                    <DialogContentText component="div" sx={{ color: 'text.primary' }}>
                      <p className="mb-3">
                        Ao confirmar, você <strong>perderá imediatamente</strong> o acesso a:
                      </p>
                      <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-700">
                        <li>Provas reais de concursos</li>
                        <li>Treinos inteligentes guiados por IA</li>
                        <li>Diagnóstico personalizado dos seus pontos fracos</li>
                        <li>Seu histórico de progresso e desempenho</li>
                      </ul>
                      <p className="mb-2">
                        O reembolso será processado em até 10 dias úteis.
                      </p>
                      <p className="text-slate-600 text-sm">
                        Se algo não está funcionando como esperado, entre em contato conosco antes de cancelar — podemos ajudar.
                      </p>
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      onClick={() => setRefundDialogOpen(false)}
                      variant="contained"
                      color="primary"
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Continuar assinando
                    </Button>
                    <Button
                      onClick={() => {
                        if (access.lastPurchaseId) {
                          onRequestRefund(access.lastPurchaseId)
                          setRefundDialogOpen(false)
                        }
                      }}
                      variant="contained"
                      color="error"
                      disabled={loading}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {loading ? 'Cancelando…' : 'Sim, quero cancelar'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // inactive
  return (
    <Card noElevation className="overflow-hidden border-2 border-dashed border-slate-200 rounded-2xl">
      <div className="p-8 sm:p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <XCircleIcon className="w-10 h-10 text-slate-400" />
        </div>
        <span className="inline-block text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full mb-3">
          Sem assinatura
        </span>
        <h3 className="text-xl font-bold text-slate-900">
          Assine para acessar
        </h3>
        <p className="text-slate-600 text-sm mt-2 max-w-sm">
          Escolha um plano para ter acesso a provas reais, treinos inteligentes e diagnóstico personalizado.
        </p>
        <Link to="/planos" className="mt-6 w-full sm:w-auto">
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<CreditCardIcon className="w-5 h-5" />}
            fullWidth
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.5, px: 4 }}
          >
            Ver planos
          </Button>
        </Link>
      </div>
    </Card>
  )
}
