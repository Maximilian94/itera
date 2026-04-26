import { Card } from '@/components/Card'
import { PageHero } from '@/components/PageHero'
import { PpTooltip } from '@/components/PpTooltip'
import { MobileCard } from '@/ui/mobile'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import { useClerkAuth } from '@/auth/clerk'
import type { UserResource } from '@clerk/types'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { useOpenPortal } from '@/features/stripe/hooks/useOpenPortal'
import { useIsMobile } from '@/lib/useIsMobile'
import {
  AcademicCapIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ClockIcon,
  DocumentTextIcon,
  PlayIcon,
  PlusIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getStagePath } from './treino/-stages.config'
import type { TreinoStageSlug } from './treino/-stages.config'
import dayjs from 'dayjs'
import { formatExamBaseTitle } from '@/lib/utils'
import colors from 'tailwindcss/colors'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(user: UserResource | null): string {
  if (!user) return ''
  return user.firstName ?? ''
}

function linearRegressionSlope(scores: number[]): number | null {
  const n = scores.length
  if (n < 2) return null
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += scores[i]
    sumXY += i * scores[i]
    sumX2 += i * i
  }
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  return (n * sumXY - sumX * sumY) / denom
}

const STAGE_LABELS: Record<string, string> = {
  EXAM: 'Fazendo a prova',
  DIAGNOSIS: 'Diagnóstico',
  STUDY: 'Estudando',
  RETRY: 'Re-tentativa',
  FINAL: 'Concluído',
}

const STAGE_COLORS: Record<string, string> = {
  EXAM: 'bg-cyan-100 text-cyan-700',
  DIAGNOSIS: 'bg-amber-100 text-amber-700',
  STUDY: 'bg-emerald-100 text-emerald-700',
  RETRY: 'bg-violet-100 text-violet-700',
  FINAL: 'bg-rose-100 text-rose-700',
}

const STAGE_SLUG: Record<string, TreinoStageSlug> = {
  EXAM: 'prova',
  DIAGNOSIS: 'diagnostico',
  STUDY: 'estudo',
  RETRY: 'retentativa',
  FINAL: 'final',
}

const STAGE_PROGRESS: Record<string, number> = {
  EXAM: 20,
  DIAGNOSIS: 40,
  STUDY: 60,
  RETRY: 80,
  FINAL: 100,
}

function MobileStatCard({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string
  value: string
  delta?: number | null
  deltaLabel?: string
}) {
  const trend =
    delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const trendStyle =
    trend === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : trend === 'down'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-500'
  const TrendIcon =
    trend === 'up' ? ArrowUpIcon : trend === 'down' ? ArrowDownIcon : null

  return (
    <MobileCard>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {deltaLabel ? (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendStyle}`}
        >
          {TrendIcon ? <TrendIcon className="size-3" /> : null}
          {deltaLabel}
        </div>
      ) : null}
    </MobileCard>
  )
}

function MobileActionTile({
  to,
  icon: Icon,
  title,
  accent,
  iconBg,
}: {
  to: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  accent: string
  iconBg: string
}) {
  return (
    <Link to={to} className="block text-inherit no-underline">
      <MobileCard className="h-full p-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
          >
            <Icon className={`size-5 ${accent}`} />
          </div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
        </div>
      </MobileCard>
    </Link>
  )
}

function ActionCard({
  to,
  icon: Icon,
  title,
  description,
  accent,
  iconBg,
  primary = false,
  animDelay = 0,
}: {
  to: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  accent: string
  iconBg: string
  primary?: boolean
  animDelay?: number
}) {
  return (
    <Link to={to} className="no-underline text-inherit block">
      <Card
        noElevation={!primary}
        className={`p-5 border transition-all duration-200 cursor-pointer group h-full ${
          primary
            ? 'border-cyan-200 bg-cyan-50/60 hover:bg-cyan-50 hover:border-cyan-300 hover:shadow-md'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
        }`}
      >
        <div
          className="flex flex-col gap-3"
          style={{
            animation: `fade-in-up 0.5s ease-out ${animDelay}ms both`,
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
            >
              <Icon className={`w-5.5 h-5.5 ${accent}`} />
            </div>
            <ArrowRightIcon
              className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 ${
                primary ? 'text-cyan-500' : 'text-slate-300'
              }`}
            />
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                primary ? 'text-cyan-600' : 'text-sky-900'
              }`}
            >
              {title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useClerkAuth()
  const { access, isLoading: accessLoading } = useAccessState()
  const { isLimitReached, isEliteAtLimit } = useRequireAccess()
  const { openPortal, loading: portalLoading } = useOpenPortal('/')
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()
  const { data: trainings = [], isLoading: loadingTrainings } =
    useTrainingsQuery()

  const canDoFreeTraining =
    access.status === 'inactive' && (access.canDoFreeTraining ?? false)

  useEffect(() => {
    if (accessLoading) return
    if (canDoFreeTraining) {
      navigate({ to: '/onboarding' })
    }
  }, [canDoFreeTraining, accessLoading, navigate])

  const firstName = user ? getFirstName(user) : ''
  const greeting = getGreeting()

  if (accessLoading || canDoFreeTraining) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse text-slate-400 text-sm">
          Carregando...
        </div>
      </div>
    )
  }

  const totalTrainings = trainings.length
  const concludedTrainings = trainings.filter(
    (t) => t.currentStage === 'FINAL',
  ).length
  const activeTrainings = trainings.filter((t) => t.currentStage !== 'FINAL')

  const trainingsUsed =
    access.status === 'active' || access.status === 'trial'
      ? access.trainingsUsedThisMonth
      : 0
  const trainingsAvailable =
    access.status === 'active' || access.status === 'trial'
      ? access.trainingLimit
      : 0
  const hasTrainingQuota =
    access.status === 'active' || access.status === 'trial'
      ? trainingsUsed < trainingsAvailable
      : false
  const lastActiveTraining = activeTrainings[0] ?? null
  const canCreateTraining =
    hasTrainingQuota && activeTrainings.length === 0

  const scoreHistory = historyItems
    .filter((i) => i.finishedAt != null && i.percentage != null)
    .map((i) => ({
      date: dayjs(i.finishedAt!).toDate(),
      score: i.percentage!,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const now = dayjs()
  const lastMonth = now.subtract(1, 'month')

  const attemptsThisMonth = scoreHistory.filter((p) =>
    dayjs(p.date).isSame(now, 'month'),
  )
  const attemptsLastMonth = scoreHistory.filter((p) =>
    dayjs(p.date).isSame(lastMonth, 'month'),
  )

  const avgThisMonth =
    attemptsThisMonth.length > 0
      ? attemptsThisMonth.reduce((s, p) => s + p.score, 0) /
        attemptsThisMonth.length
      : null
  const avgLastMonth =
    attemptsLastMonth.length > 0
      ? attemptsLastMonth.reduce((s, p) => s + p.score, 0) /
        attemptsLastMonth.length
      : null

  const initialScoreTrend =
    avgThisMonth != null && avgLastMonth != null
      ? avgThisMonth - avgLastMonth
      : null

  const trendSlopePerExam =
    scoreHistory.length >= 2
      ? linearRegressionSlope(scoreHistory.map((p) => p.score))
      : null

  const trainingsWithScores = trainings
    .filter(
      (t) =>
        t.currentStage === 'FINAL' &&
        t.initialScorePercentage != null &&
        t.finalScorePercentage != null,
    )
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    )
  const avgTrainingImprovement =
    trainingsWithScores.length > 0
      ? trainingsWithScores.reduce(
          (sum, t) =>
            sum +
            (t.finalScorePercentage ?? 0) -
            (t.initialScorePercentage ?? 0),
          0,
        ) / trainingsWithScores.length
      : null

  const trainingImprovementHistory = trainingsWithScores.map((t) => ({
    date: dayjs(t.updatedAt).toDate(),
    improvement:
      (t.finalScorePercentage ?? 0) - (t.initialScorePercentage ?? 0),
  }))

  const activeAttempt = historyItems.find(
    (i) => i.finishedAt == null && i.examBoardId != null,
  )
  const concludedAttempts = historyItems.filter(
    (i) => i.finishedAt != null,
  ).length
  const concludedAttemptsThisMonth = attemptsThisMonth.length
  const concludedAttemptsLastMonth = attemptsLastMonth.length
  const attemptsDelta =
    concludedAttemptsThisMonth - concludedAttemptsLastMonth

  const sparklineData = scoreHistory.slice(-10).map((p) => p.score)
  const latestScore =
    scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : null

  const goPrimary = () => {
    if (activeAttempt) {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: {
          examBoard: activeAttempt.examBoardId!,
          examId: activeAttempt.examBaseId,
          attemptId: activeAttempt.id,
        },
      })
      return
    }
    if (lastActiveTraining) {
      navigate({
        to: getStagePath(
          STAGE_SLUG[lastActiveTraining.currentStage] ?? 'prova',
          lastActiveTraining.trainingId,
        ),
      })
      return
    }
    if (canCreateTraining) {
      navigate({ to: '/treino/novo' })
      return
    }
  }

  const primaryCta = activeAttempt
    ? { label: 'Continuar exame', icon: PlayIcon, available: true }
    : lastActiveTraining
      ? { label: 'Continuar treino', icon: PlayIcon, available: true }
      : canCreateTraining
        ? { label: 'Criar treino', icon: PlusIcon, available: true }
        : isLimitReached
          ? {
              label: isEliteAtLimit ? 'Ver assinatura' : 'Fazer upgrade',
              icon: RocketLaunchIcon,
              available: true,
            }
          : { label: 'Explorar exames', icon: DocumentTextIcon, available: true }

  const handlePrimaryCta = () => {
    if (isLimitReached && !activeAttempt && !lastActiveTraining) {
      openPortal()
      return
    }
    if (!activeAttempt && !lastActiveTraining && !canCreateTraining) {
      navigate({ to: '/exams', search: { board: undefined } })
      return
    }
    goPrimary()
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <section className="overflow-hidden rounded-3xl bg-linear-to-br from-cyan-600 via-cyan-700 to-sky-900 p-5 text-white shadow-lg shadow-cyan-950/20">
          <p className="text-xs font-medium text-cyan-100/80">
            {greeting}
            {firstName ? ',' : ''}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {firstName || 'Bem-vindo'}
          </h1>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
                Treinos do mês
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {access.status === 'active' || access.status === 'trial'
                  ? `${trainingsUsed} / ${trainingsAvailable}`
                  : 'Sem assinatura'}
              </p>
            </div>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width:
                    access.status === 'active' || access.status === 'trial'
                      ? `${Math.min(
                          (trainingsUsed / Math.max(trainingsAvailable, 1)) *
                            100,
                          100,
                        )}%`
                      : '0%',
                }}
              />
            </div>
          </div>

          <Button
            variant="contained"
            color="inherit"
            fullWidth
            disabled={portalLoading}
            startIcon={<primaryCta.icon className="w-4 h-4" />}
            onClick={handlePrimaryCta}
            sx={{
              mt: 2,
              color: '#0f172a',
              bgcolor: '#fff',
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.25,
              '&:hover': { bgcolor: '#e2e8f0' },
            }}
          >
            {portalLoading ? 'Abrindo…' : primaryCta.label}
          </Button>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <MobileStatCard
            label="Provas concluídas"
            value={String(concludedAttempts)}
            delta={attemptsDelta}
            deltaLabel={
              concludedAttemptsThisMonth > 0 || concludedAttemptsLastMonth > 0
                ? `${attemptsDelta >= 0 ? '+' : ''}${attemptsDelta} no mês`
                : undefined
            }
          />
          <MobileStatCard
            label="Treinos ativos"
            value={String(activeTrainings.length)}
            deltaLabel={
              concludedTrainings > 0
                ? `${concludedTrainings} concluído${concludedTrainings !== 1 ? 's' : ''}`
                : undefined
            }
          />
        </div>

        <MobileCard>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="size-4 text-cyan-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Sua evolução
                </h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {loadingHistory
                  ? 'Carregando...'
                  : initialScoreTrend != null
                    ? initialScoreTrend > 0
                      ? `Sua média subiu ${initialScoreTrend.toFixed(1)} p.p. esse mês.`
                      : initialScoreTrend < 0
                        ? `Sua média caiu ${Math.abs(initialScoreTrend).toFixed(1)} p.p. esse mês.`
                        : 'Sua média ficou estável esse mês.'
                    : scoreHistory.length === 0
                      ? 'Conclua provas para acompanhar.'
                      : 'Faça provas em mais de um mês para comparar.'}
              </p>
            </div>
            {latestScore != null ? (
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Última
                </p>
                <p className="text-lg font-bold tracking-tight text-slate-900">
                  {latestScore.toFixed(0)}%
                </p>
              </div>
            ) : null}
          </div>

          {sparklineData.length >= 2 ? (
            <div className="mt-3 h-16 w-full">
              <SparkLineChart
                data={sparklineData}
                height={64}
                color={colors.cyan[500]}
                area
                showHighlight
                showTooltip
                yAxis={{ min: 0, max: 100 }}
              />
            </div>
          ) : (
            <div className="mt-3 flex h-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">
                Sem dados suficientes ainda
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            {trendSlopePerExam != null ? (
              <p className="text-[11px] text-slate-500">
                {trendSlopePerExam > 0
                  ? `+${trendSlopePerExam.toFixed(1)} p.p. por prova`
                  : trendSlopePerExam < 0
                    ? `${trendSlopePerExam.toFixed(1)} p.p. por prova`
                    : 'Estável entre provas'}
              </p>
            ) : (
              <span />
            )}
            <Link
              to="/evolucao-como-funciona"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 no-underline"
            >
              Como é calculado?
              <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </MobileCard>

        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Atalhos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MobileActionTile
              to="/treino/novo"
              icon={RocketLaunchIcon}
              title="Novo treino"
              accent="text-cyan-700"
              iconBg="bg-cyan-100"
            />
            <MobileActionTile
              to="/treino"
              icon={AcademicCapIcon}
              title="Meus treinos"
              accent="text-emerald-700"
              iconBg="bg-emerald-100"
            />
            <MobileActionTile
              to="/exams"
              icon={DocumentTextIcon}
              title="Exames"
              accent="text-violet-700"
              iconBg="bg-violet-100"
            />
            <MobileActionTile
              to="/history"
              icon={ClockIcon}
              title="Histórico"
              accent="text-slate-700"
              iconBg="bg-slate-100"
            />
          </div>
        </div>

        {activeTrainings.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Treinos em andamento
              </h2>
              <Link
                to="/treino"
                className="text-sm font-semibold text-cyan-700 no-underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="grid gap-3">
              {activeTrainings.slice(0, 3).map((t) => {
                const stageLabel =
                  STAGE_LABELS[t.currentStage] ?? t.currentStage
                const stageColor =
                  STAGE_COLORS[t.currentStage] ?? 'bg-slate-100 text-slate-700'
                const slug = STAGE_SLUG[t.currentStage] ?? 'prova'
                const progress = STAGE_PROGRESS[t.currentStage] ?? 0

                return (
                  <Link
                    key={t.trainingId}
                    to={getStagePath(slug, t.trainingId)}
                    className="block text-inherit no-underline"
                  >
                    <MobileCard>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {t.examTitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Atualizado em{' '}
                            {dayjs(t.updatedAt).format('DD/MM/YY')}
                          </p>
                        </div>
                        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-slate-300" />
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageColor}`}
                        >
                          {stageLabel}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {progress}%
                        </span>
                      </div>
                    </MobileCard>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-6">
      <PageHero
        greeting={`${greeting}${firstName ? ',' : ''}`}
        title={firstName || 'Bem-vindo'}
        description="Acompanhe seu progresso, continue seus treinos e avance nos seus estudos para concursos."
      />

      <div style={{ animation: 'fade-in-up 0.5s ease-out 50ms both' }}>
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Treinos do mês
                </p>
                <p className="text-xs text-slate-500">
                  {access.status === 'active' || access.status === 'trial' ? (
                    <>
                      <span className="font-medium text-slate-700">
                        {trainingsUsed}
                      </span>
                      {' usados / '}
                      <span className="font-medium text-slate-700">
                        {trainingsAvailable}
                      </span>
                      {' disponíveis'}
                    </>
                  ) : (
                    'Assine um plano para ter treinos inteligentes'
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {lastActiveTraining ? (
                <Link
                  to={getStagePath(
                    STAGE_SLUG[lastActiveTraining.currentStage] ?? 'prova',
                    lastActiveTraining.trainingId,
                  )}
                  className="no-underline"
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<PlayIcon className="w-4 h-4" />}
                  >
                    Continuar treino
                  </Button>
                </Link>
              ) : canCreateTraining ? (
                <Link to="/treino/novo" className="no-underline">
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    Criar treino
                  </Button>
                </Link>
              ) : isLimitReached ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {isEliteAtLimit && (
                    <p className="text-xs text-slate-500 sm:mr-2 self-center">
                      Novos treinos em{' '}
                      {dayjs()
                        .add(1, 'month')
                        .startOf('month')
                        .format('DD/MM/YYYY')}
                    </p>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={portalLoading}
                    onClick={openPortal}
                  >
                    {portalLoading
                      ? 'Abrindo…'
                      : isEliteAtLimit
                        ? 'Ver assinatura'
                        : 'Fazer upgrade'}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ animation: 'fade-in-up 0.5s ease-out 400ms both' }}
      >
        <Card noElevation className="p-5 border border-slate-200">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                <ArrowTrendingUpIcon className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Evolução da nota inicial
                </h3>
                <div className="space-y-1 mt-0.5">
                  <p className="text-xs text-slate-500">
                    {loadingHistory ? (
                      'Carregando...'
                    ) : initialScoreTrend != null ? (
                      initialScoreTrend > 0 ? (
                        <>
                          Sua nota média{' '}
                          <span className="font-medium text-emerald-600">
                            subiu {initialScoreTrend.toFixed(1)}{' '}
                            <PpTooltip />
                          </span>{' '}
                          em relação ao mês anterior
                        </>
                      ) : initialScoreTrend < 0 ? (
                        <>
                          Sua nota média{' '}
                          <span className="font-medium text-rose-600">
                            caiu {Math.abs(initialScoreTrend).toFixed(1)}{' '}
                            <PpTooltip />
                          </span>{' '}
                          em relação ao mês anterior
                        </>
                      ) : (
                        'Sua nota média se manteve estável em relação ao mês anterior'
                      )
                    ) : scoreHistory.length === 0 ? (
                      'Faça provas para acompanhar sua evolução'
                    ) : (
                      'Faça provas em dois meses para ver a tendência'
                    )}
                  </p>
                  {!loadingHistory && trendSlopePerExam != null && (
                    <p className="text-xs text-slate-500">
                      {trendSlopePerExam > 0 ? (
                        <>
                          Em média, a cada nova prova sua nota{' '}
                          <span className="font-medium text-emerald-600">
                            sobe {trendSlopePerExam.toFixed(1)}{' '}
                            <PpTooltip />
                          </span>
                        </>
                      ) : trendSlopePerExam < 0 ? (
                        <>
                          Em média, a cada nova prova sua nota{' '}
                          <span className="font-medium text-rose-600">
                            cai {Math.abs(trendSlopePerExam).toFixed(1)}{' '}
                            <PpTooltip />
                          </span>
                        </>
                      ) : (
                        'Sua nota está estável entre as provas.'
                      )}
                    </p>
                  )}
                  <Link
                    to="/evolucao-como-funciona"
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium no-underline inline-flex items-center gap-0.5 mt-1"
                  >
                    Como é calculado?
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {scoreHistory.length > 0 ? (
            <div className="h-[240px] w-full min-w-0">
              <LineChart
                dataset={scoreHistory}
                xAxis={[
                  {
                    dataKey: 'date',
                    scaleType: 'time',
                    valueFormatter: (value: Date) =>
                      dayjs(value).format('DD/MM/YY'),
                  },
                ]}
                yAxis={[
                  {
                    valueFormatter: (value: number) => `${value}%`,
                  },
                ]}
                series={[
                  {
                    dataKey: 'score',
                    label: 'Nota (%)',
                    color: colors.cyan[600],
                    showMark: true,
                  },
                ]}
                height={220}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                grid={{ vertical: true, horizontal: true }}
                hideLegend
              />
            </div>
          ) : (
            !loadingHistory && (
              <div className="h-[100px] flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200">
                <p className="text-sm text-slate-500 text-center px-2">
                  Nenhuma prova concluída ainda.
                </p>
              </div>
            )
          )}
        </Card>

        <Card noElevation className="p-5 border border-slate-200">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <AcademicCapIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Evolução nos treinos
                </h3>
                <div className="space-y-1 mt-0.5">
                  <p className="text-xs text-slate-500">
                    {loadingTrainings ? (
                      'Carregando...'
                    ) : avgTrainingImprovement != null ? (
                      avgTrainingImprovement > 0 ? (
                        <>
                          Em média, sua nota{' '}
                          <span className="font-medium text-emerald-600">
                            sobe {avgTrainingImprovement.toFixed(1)}{' '}
                            <PpTooltip />
                          </span>{' '}
                          do início ao fim de cada treino
                        </>
                      ) : avgTrainingImprovement < 0 ? (
                        <>
                          Em média, sua nota{' '}
                          <span className="font-medium text-rose-600">
                            cai {Math.abs(avgTrainingImprovement).toFixed(1)}{' '}
                            <PpTooltip />
                          </span>{' '}
                          do início ao fim de cada treino
                        </>
                      ) : (
                        'Sua nota se mantém estável do início ao fim dos treinos'
                      )
                    ) : (
                      'Conclua treinos para ver sua evolução'
                    )}
                  </p>
                  <Link
                    to="/evolucao-como-funciona"
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium no-underline inline-flex items-center gap-0.5 mt-1"
                  >
                    Como é calculado?
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {trainingImprovementHistory.length > 0 ? (
            <div className="h-[240px] w-full min-w-0">
              <LineChart
                dataset={trainingImprovementHistory}
                xAxis={[
                  {
                    dataKey: 'date',
                    scaleType: 'time',
                    valueFormatter: (value: Date) =>
                      dayjs(value).format('DD/MM/YY'),
                  },
                ]}
                yAxis={[
                  {
                    valueFormatter: (value: number) =>
                      `${value >= 0 ? '+' : ''}${value} p.p.`,
                  },
                ]}
                series={[
                  {
                    dataKey: 'improvement',
                    label: 'Ganho (p.p.)',
                    color: '#059669',
                    showMark: true,
                  },
                ]}
                height={220}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                grid={{ vertical: true, horizontal: true }}
                hideLegend
              />
            </div>
          ) : (
            !loadingTrainings && (
              <div className="h-[100px] flex items-center justify-center rounded-lg bg-slate-50 border border-dashed border-slate-200">
                <p className="text-sm text-slate-500 text-center px-2">
                  Nenhum treino concluído ainda.
                </p>
              </div>
            )
          )}
        </Card>
      </div>

      <div style={{ animation: 'fade-in-up 0.5s ease-out 450ms both' }}>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            to="/treino/novo"
            icon={RocketLaunchIcon}
            title="Criar novo treino"
            description="Escolha um simulado e comece a evoluir"
            accent="text-cyan-600"
            iconBg="bg-cyan-100"
            primary
            animDelay={150}
          />
          <ActionCard
            to="/treino"
            icon={AcademicCapIcon}
            title="Meus treinos"
            description={
              totalTrainings > 0
                ? `${totalTrainings} treino${totalTrainings !== 1 ? 's' : ''} · ${concludedTrainings} concluído${concludedTrainings !== 1 ? 's' : ''}`
                : 'Veja seus treinos e continue onde parou'
            }
            accent="text-cyan-600"
            iconBg="bg-cyan-100"
            animDelay={200}
          />
          <ActionCard
            to="/exams"
            icon={DocumentTextIcon}
            title="Exames"
            description="Explore provas e simulados disponíveis"
            accent="text-violet-600"
            iconBg="bg-violet-100"
            animDelay={250}
          />
          <ActionCard
            to="/history"
            icon={ClockIcon}
            title="Histórico"
            description="Histórico completo de tentativas"
            accent="text-slate-600"
            iconBg="bg-slate-100"
            animDelay={300}
          />
        </div>
      </div>

      {activeTrainings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Treinos em andamento
            </h2>
            <Link
              to="/treino"
              className="text-xs text-cyan-600 hover:text-cyan-500 font-medium no-underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTrainings.slice(0, 3).map((t, idx) => {
              const stageLabel =
                STAGE_LABELS[t.currentStage] ?? t.currentStage
              const stageColor =
                STAGE_COLORS[t.currentStage] ?? 'bg-slate-100 text-slate-700'
              const slug = STAGE_SLUG[t.currentStage] ?? 'prova'
              const progress = STAGE_PROGRESS[t.currentStage] ?? 0

              return (
                <Link
                  key={t.trainingId}
                  to={getStagePath(slug, t.trainingId)}
                  className="no-underline text-inherit block"
                >
                  <Card
                    noElevation
                    className="p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer group h-full"
                  >
                    <div
                      style={{
                        animation: `fade-in-up 0.5s ease-out ${500 + idx * 80}ms both`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-sm font-semibold text-slate-800 truncate flex-1">
                          {t.examTitle}
                        </p>
                        <ArrowRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2.5">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${stageColor}`}
                        >
                          {stageLabel}
                        </span>
                        <span className="text-[0.65rem] text-slate-400">
                          {dayjs(t.updatedAt).format('DD/MM/YY')}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {activeAttempt && (
        <Card
          noElevation
          className="p-5 border-2 border-cyan-200 bg-cyan-50/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                <PlayIcon className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cyan-800">
                  Você tem um exame em andamento
                </p>
                <p className="text-xs text-cyan-600/70 truncate">
                  {formatExamBaseTitle({
                    examDate: activeAttempt.examDate,
                    institution: activeAttempt.institution,
                    name: activeAttempt.examBaseName,
                    state: activeAttempt.state,
                    city: activeAttempt.city,
                  })}
                </p>
              </div>
            </div>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PlayIcon className="w-4 h-4" />}
              onClick={() =>
                navigate({
                  to: '/exams/$examBoard/$examId/$attemptId',
                  params: {
                    examBoard: activeAttempt.examBoardId!,
                    examId: activeAttempt.examBaseId,
                    attemptId: activeAttempt.id,
                  },
                })
              }
            >
              Continuar exame
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
