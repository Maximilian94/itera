import { Card } from '@/components/Card'
import { PageHero } from '@/components/PageHero'
import { PpTooltip } from '@/components/PpTooltip'
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  PlayIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  getStagePath,
  getStageBySlug,
  TREINO_STAGES,
} from './-stages.config'
import type { TreinoStageSlug } from './-stages.config'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import type {
  TrainingStage,
  TrainingListItem,
} from '@/features/training/domain/training.types'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { useOpenPortal } from '@/features/stripe/hooks/useOpenPortal'
import dayjs from 'dayjs'

const STAGE_TO_SLUG: Record<TrainingStage, TreinoStageSlug> = {
  EXAM: 'prova',
  DIAGNOSIS: 'diagnostico',
  STUDY: 'estudo',
  RETRY: 'retentativa',
  FINAL: 'final',
}

const STAGE_PROGRESS: Record<TrainingStage, number> = {
  EXAM: 20,
  DIAGNOSIS: 40,
  STUDY: 60,
  RETRY: 80,
  FINAL: 100,
}

export const Route = createFileRoute('/_authenticated/treino/')({
  component: TreinoIndexPage,
})

/* ------------------------------------------------------------------ */
/*  Training card for active trainings                                 */
/* ------------------------------------------------------------------ */

function ActiveTrainingCard({
  item,
  animDelay = 0,
}: {
  item: TrainingListItem
  animDelay?: number
}) {
  const slug = STAGE_TO_SLUG[item.currentStage]
  const stage = getStageBySlug(slug)
  const progress = STAGE_PROGRESS[item.currentStage]
  const continuePath = getStagePath(slug, item.trainingId)
  const StageIcon = stage?.icon

  return (
    <Link to={continuePath} className="block no-underline text-inherit">
      <Card
        noElevation
        className="p-0 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group overflow-hidden h-full"
      >
        <div
          style={{
            animation: `fade-in-up 0.45s ease-out ${animDelay}ms both`,
          }}
        >
          {/* Progress bar at top */}
          <div className="h-1.5 w-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${stage?.activeBg ?? 'bg-cyan-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-slate-800 truncate flex-1">
                {item.examTitle}
              </p>
              <ArrowRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </div>

            {/* Stage info */}
            <div className="flex items-center gap-2 mb-3">
              {StageIcon && (
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${stage?.color ?? 'bg-slate-100 text-slate-600'}`}
                >
                  <StageIcon className="w-3.5 h-3.5" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {stage?.title}
                </p>
                <p className="text-[0.6rem] text-slate-400">
                  {stage?.subtitle}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[0.65rem] text-slate-400">
                {dayjs(item.updatedAt).format('DD/MM/YY HH:mm')}
              </span>
              <span className="text-[0.65rem] font-medium text-cyan-600 group-hover:text-cyan-700">
                Continuar
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Training row for concluded trainings                               */
/* ------------------------------------------------------------------ */

function ConcludedTrainingRow({
  item,
  animDelay = 0,
}: {
  item: TrainingListItem
  animDelay?: number
}) {
  const slug = STAGE_TO_SLUG[item.currentStage]
  const continuePath = getStagePath(slug, item.trainingId)

  const initial = item.initialScorePercentage
  const final_ = item.finalScorePercentage
  const minGrade = item.minPassingGrade
  const hasEvolution = initial != null && final_ != null
  const gain = hasEvolution ? final_ - initial : 0
  const improved = gain > 0

  const passedBefore =
    minGrade != null && initial != null ? initial >= minGrade : null
  const passedAfter =
    minGrade != null && final_ != null ? final_ >= minGrade : null

  return (
    <Link to={continuePath} className="block no-underline text-inherit">
      <Card
        noElevation
        className="p-0 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group overflow-hidden h-full"
      >
        <div
          style={{
            animation: `fade-in-up 0.4s ease-out ${animDelay}ms both`,
          }}
        >
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {/* Row 1: title + scores */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {item.examTitle}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dayjs(item.updatedAt).format('DD/MM/YYYY')}
                  </p>
                </div>
              </div>

              {/* Right: evolution + score */}
              <div className="flex items-center gap-3 shrink-0">
                {hasEvolution && (
                  <div className="flex items-center gap-3">
                    {/* Before -> After */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 tabular-nums">
                        {initial.toFixed(0)}%
                      </span>
                      <ArrowRightIcon className="w-3 h-3 text-slate-300" />
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {final_.toFixed(0)}%
                      </span>
                    </div>

                    {/* Gain badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${
                        improved
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {improved ? (
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                      ) : (
                        <MinusIcon className="w-3 h-3" />
                      )}
                      {improved ? '+' : ''}
                      {gain.toFixed(0)} <PpTooltip />
                    </span>
                  </div>
                )}

                {!hasEvolution && final_ != null && (
                  <div className="flex items-center gap-1.5">
                    <TrophyIcon className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                      {final_.toFixed(0)}%
                    </span>
                  </div>
                )}

                <ArrowRightIcon className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Row 2: pass/fail before & after */}
            {passedBefore != null && passedAfter != null && (
              <div className="flex items-center gap-2 pl-12">
                {/* Before */}
                <span
                  className={`inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${
                    passedBefore
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {passedBefore ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  {passedBefore ? 'Aprovado' : 'Reprovado'}
                </span>

                <ArrowRightIcon className="w-3 h-3 text-slate-300" />

                {/* After */}
                <span
                  className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${
                    passedAfter
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {passedAfter ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  {passedAfter ? 'Aprovado' : 'Reprovado'}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function TreinoIndexPage() {
  const { data: trainings = [], isLoading } = useTrainingsQuery()
  const { isLimitReached, isEliteAtLimit } = useRequireAccess()
  const { openPortal, loading: portalLoading } = useOpenPortal('/treino')

  const total = trainings.length
  const concludedTrainings = trainings.filter(
    (t) => t.currentStage === 'FINAL',
  )
  const activeTrainings = trainings.filter(
    (t) => t.currentStage !== 'FINAL',
  )
  const concluded = concludedTrainings.length
  const inProgress = activeTrainings.length

  // Best score among finished
  const bestScore = concludedTrainings.reduce<number | null>((best, t) => {
    if (t.finalScorePercentage == null) return best
    return best == null
      ? t.finalScorePercentage
      : Math.max(best, t.finalScorePercentage)
  }, null)

  return (
    <div className="-m-1 p-2 flex flex-col gap-8 pb-6 overflow-visible">
      {/* ═══════════ HERO ═══════════ */}
      <div className="-m-2">
      <PageHero
        title="Treino"
        description="Seu erro vira plano de estudo. Faça a prova, estude o que precisa e veja o quanto evoluiu."
        variant="cyan"
      >
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : total}
            </p>
            <p className="text-[0.65rem] text-emerald-100/70 font-medium uppercase tracking-wide">
              Total
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : concluded}
            </p>
            <p className="text-[0.65rem] text-emerald-100/70 font-medium uppercase tracking-wide">
              Concluídos
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : bestScore != null ? `${bestScore.toFixed(0)}%` : '—'}
            </p>
            <p className="text-[0.65rem] text-emerald-100/70 font-medium uppercase tracking-wide">
              Melhor nota
            </p>
          </div>
        </div>
      </PageHero>
      </div>

      {/* ═══════════ RESUMO ═══════════ */}
      <div style={{ animation: 'fade-in-up 0.5s ease-out 80ms both' }}>
        <Card noElevation className="p-5 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Resumo</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100">
                <AcademicCapIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {isLoading ? '—' : total}
                </p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-emerald-700">
                  {isLoading ? '—' : concluded}
                </p>
                <p className="text-xs text-slate-500">Concluídos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
                <PlayIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-amber-700">
                  {isLoading ? '—' : inProgress}
                </p>
                <p className="text-xs text-slate-500">Em andamento</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════ CTA: CREATE NEW ═══════════ */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40"
        style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800">
            {isLimitReached ? 'Limite do mês atingido' : 'Pronto para evoluir?'}
          </p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            {isLimitReached
              ? isEliteAtLimit
                ? `Novos treinos disponíveis em ${dayjs().add(1, 'month').startOf('month').format('DD/MM/YYYY')}.`
                : 'Faça upgrade para ter mais treinos.'
              : 'Escolha um simulado e comece um novo ciclo de treino com IA.'}
          </p>
        </div>
        {isLimitReached ? (
          <Button
            variant="contained"
            color="primary"
            disabled={portalLoading}
            onClick={openPortal}
            startIcon={<RocketLaunchIcon className="w-5 h-5" />}
            className="shrink-0"
          >
            {portalLoading ? 'Abrindo…' : isEliteAtLimit ? 'Ver assinatura' : 'Fazer upgrade'}
          </Button>
        ) : (
          <Link to="/treino/novo" className="shrink-0 no-underline">
            <Button
              variant="contained"
              color="primary"
              startIcon={<RocketLaunchIcon className="w-5 h-5" />}
            >
              Criar novo treino
            </Button>
          </Link>
        )}
      </div>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <div style={{ animation: 'fade-in-up 0.5s ease-out 150ms both' }}>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Como funciona
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {TREINO_STAGES.map((stage, idx) => {
            const Icon = stage.icon
            return (
              <div
                key={stage.slug}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 text-center"
                style={{
                  animation: `fade-in-up 0.4s ease-out ${200 + idx * 60}ms both`,
                }}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stage.color}`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {stage.title}
                  </p>
                  <p className="text-[0.6rem] text-slate-400 leading-tight mt-0.5">
                    {stage.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════ ACTIVE TRAININGS ═══════════ */}
      {!isLoading && activeTrainings.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
            style={{ animation: 'fade-in-up 0.5s ease-out 400ms both' }}
          >
            Em andamento ({inProgress})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTrainings.map((t, idx) => (
              <ActiveTrainingCard
                key={t.trainingId}
                item={t}
                animDelay={450 + idx * 60}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ CONCLUDED TRAININGS ═══════════ */}
      {!isLoading && concludedTrainings.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
            style={{ animation: 'fade-in-up 0.5s ease-out 500ms both' }}
          >
            Concluídos ({concluded})
          </h2>
          <div className="flex flex-col gap-2">
            {concludedTrainings.map((t, idx) => (
              <ConcludedTrainingRow
                key={t.trainingId}
                item={t}
                animDelay={550 + idx * 50}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ LOADING ═══════════ */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-200/60" />
          ))}
        </div>
      )}

      {/* ═══════════ EMPTY STATE ═══════════ */}
      {!isLoading && trainings.length === 0 && (
        <Card noElevation className="p-10 border border-slate-200 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <RocketLaunchIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                {isLimitReached
                  ? 'Limite do mês atingido'
                  : 'Comece seu primeiro treino'}
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {isLimitReached
                  ? isEliteAtLimit
                    ? `Novos treinos disponíveis em ${dayjs().add(1, 'month').startOf('month').format('DD/MM/YYYY')}.`
                    : 'Faça upgrade para ter mais treinos este mês.'
                  : 'Escolha um simulado, faça a prova, receba diagnóstico da IA, estude e refaça as questões que errou. Veja o quanto evoluiu!'}
              </p>
            </div>
            {isLimitReached ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={portalLoading}
                onClick={openPortal}
                startIcon={<RocketLaunchIcon className="w-5 h-5" />}
                className="mt-2"
              >
                {portalLoading ? 'Abrindo…' : isEliteAtLimit ? 'Ver assinatura' : 'Fazer upgrade'}
              </Button>
            ) : (
              <Link to="/treino/novo" className="no-underline mt-2">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<RocketLaunchIcon className="w-5 h-5" />}
                >
                  Criar novo treino
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
