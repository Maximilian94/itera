import { useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlayIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { useClerkAuth } from '@/auth/clerk'
import type { UserResource } from '@clerk/types'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { useOpenPortal } from '@/features/stripe/hooks/useOpenPortal'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import { useGoalsQuery } from '@/features/goal/queries/goal.queries'
import { useConcursosQuery } from '@/features/concurso/queries/concurso.queries'
import { usePreferenceQuery } from '@/features/preference/queries/preference.queries'
import { GoalHero } from '@/features/home/components/GoalHero'
import { SecondaryGoalRow } from '@/features/home/components/SecondaryGoalRow'
import { NoGoalHero } from '@/features/home/components/NoGoalHero'
import { WeekCard } from '@/features/home/components/WeekCard'
import { EvolutionCard } from '@/features/home/components/EvolutionCard'
import { RecommendedList } from '@/features/home/components/RecommendedList'
import {
  evolutionSummary,
  joinGoalsWithTrainings,
  toScoreHistory,
  weekActivity,
} from '@/features/home/home-logic'
import { formatExamBaseTitle } from '@/lib/utils'

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

/** "sexta-feira, 8 de agosto" — sem depender de locale do dayjs. */
function todayLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function SkeletonHome() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      <div className="h-56 rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 md:grid-cols-12">
        <div className="h-40 rounded-2xl bg-slate-200/70 md:col-span-5" />
        <div className="h-40 rounded-2xl bg-slate-200/70 md:col-span-7" />
      </div>
    </div>
  )
}

/**
 * Home "Mesa do dia": responde, nessa ordem, "o que eu faço agora?" (herói da
 * meta com retomada em 1 clique), "estou perto de passar?" (prontidão vs
 * corte), "quanto tempo tenho?" (countdown), "estou constante?" (Sua semana)
 * e "apareceu algo novo?" (Recomendados). Protótipo:
 * web-react/design-mockups/home-mesa-do-dia.html.
 */
function Dashboard() {
  const navigate = useNavigate()
  const { user } = useClerkAuth()
  const { access, isLoading: accessLoading } = useAccessState()
  const { isLimitReached, isEliteAtLimit } = useRequireAccess()
  const { openPortal, loading: portalLoading } = useOpenPortal('/')
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()
  const { data: trainings = [], isLoading: loadingTrainings } =
    useTrainingsQuery()
  const { data: goalsData, isLoading: loadingGoals } = useGoalsQuery()
  const { data: preferenceData } = usePreferenceQuery()
  const { data: concursosData } = useConcursosQuery({})

  const canDoFreeTraining =
    access.status === 'inactive' && (access.canDoFreeTraining ?? false)

  useEffect(() => {
    if (accessLoading) return
    if (canDoFreeTraining) {
      navigate({ to: '/onboarding' })
    }
  }, [canDoFreeTraining, accessLoading, navigate])

  const firstName = user ? getFirstName(user) : ''
  const loading =
    accessLoading || canDoFreeTraining || loadingGoals || loadingTrainings

  const goals = goalsData?.goals ?? []
  const { hero, others } = joinGoalsWithTrainings(goals, trainings)

  const week = weekActivity(historyItems, trainings)
  const scoreHistory = toScoreHistory(historyItems)
  const evolution = evolutionSummary(scoreHistory)

  // Exame avulso em andamento (fora de treino) — prioridade máxima de retomada.
  const activeAttempt = historyItems.find(
    (i) => i.finishedAt == null && i.examBoardId != null,
  )

  // Último treino concluído fecha o ciclo no estado sem meta.
  const lastFinal = trainings
    .filter(
      (t) =>
        t.currentStage === 'FINAL' &&
        t.initialScorePercentage != null &&
        t.finalScorePercentage != null,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0]
  const lastResult = lastFinal
    ? {
        title: lastFinal.examTitle,
        deltaPp:
          (lastFinal.finalScorePercentage ?? 0) -
          (lastFinal.initialScorePercentage ?? 0),
      }
    : null

  const quotaActive = access.status === 'active' || access.status === 'trial'
  const quota = {
    active: quotaActive,
    used: quotaActive ? access.trainingsUsedThisMonth : 0,
    limit: quotaActive ? access.trainingLimit : 0,
  }
  const blockedMessage = !quotaActive
    ? 'Assine um plano para destravar os treinos inteligentes'
    : isLimitReached
      ? isEliteAtLimit
        ? `Limite do mês atingido · novos treinos em ${dayjs()
            .add(1, 'month')
            .startOf('month')
            .format('DD/MM')}`
        : 'Você usou todos os treinos do mês'
      : null
  const upgradeCta =
    quotaActive && isLimitReached && !isEliteAtLimit
      ? {
          label: portalLoading ? 'Abrindo…' : 'Fazer upgrade',
          onClick: () => void openPortal(),
          disabled: portalLoading,
        }
      : null

  const goalConcursoIds = new Set(
    goals.flatMap((g) => [g.concurso.id, g.concurso.slug ?? g.concurso.id]),
  )

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {getGreeting()}
            {firstName ? ',' : ''}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {firstName || 'Bem-vindo'}
          </h1>
        </div>
        <p className="text-xs text-slate-500">{todayLabel()}</p>
      </header>

      {loading ? (
        <SkeletonHome />
      ) : (
        <>
          {activeAttempt && (
            <button
              type="button"
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
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-left shadow-sm transition-colors hover:bg-cyan-100"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700"
              >
                <PlayIcon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-cyan-900">
                  Você tem um exame em andamento
                </span>
                <span className="block truncate text-xs text-cyan-800/70">
                  {formatExamBaseTitle({
                    examDate: activeAttempt.examDate,
                    institution: activeAttempt.institution,
                    name: activeAttempt.examBaseName,
                    state: activeAttempt.state,
                    city: activeAttempt.city,
                  })}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-cyan-700">
                Continuar
              </span>
            </button>
          )}

          {hero ? (
            <GoalHero
              item={hero}
              quota={quota}
              blockedMessage={blockedMessage}
              upgradeCta={upgradeCta}
            />
          ) : (
            <NoGoalHero lastResult={lastResult} />
          )}

          {others.length > 0 && (
            <section aria-labelledby="other-goals-title">
              <h2
                id="other-goals-title"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Você também está treinando para
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {others.map((item) => (
                  <SecondaryGoalRow key={item.goal.id} item={item} />
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <WeekCard week={week} />
            </div>
            <div className="md:col-span-7">
              <EvolutionCard summary={evolution} loading={loadingHistory} />
            </div>
          </div>

          <RecommendedList
            concursos={concursosData?.concursos ?? []}
            excludeConcursoIds={goalConcursoIds}
            hasPreference={preferenceData?.preference != null}
          />

          {!hero && (
            <p className="text-center text-xs text-slate-400">
              Já sabe qual concurso quer?{' '}
              <Link
                to="/concursos"
                className="font-semibold text-cyan-700 no-underline hover:underline"
              >
                Encontre o cargo e clique em Treinar
              </Link>{' '}
              — ele vira sua meta aqui.
            </p>
          )}
        </>
      )}
    </div>
  )
}
