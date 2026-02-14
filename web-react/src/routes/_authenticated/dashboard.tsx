import { AttemptListItem } from '@/components/AttemptListItem'
import { Card } from '@/components/Card'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import { useClerkAuth } from '@/auth/clerk'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  PlayIcon,
  PlusIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { getStagePath } from './treino/stages.config'
import type { TreinoStageSlug } from './treino/stages.config'
import dayjs from 'dayjs'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

const RECENT_ATTEMPTS = 5

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(name: string | undefined): string {
  if (!name) return ''
  return name.split(/[\s@]/)[0]
}

/* ------------------------------------------------------------------ */
/*  Quick-action link card                                            */
/* ------------------------------------------------------------------ */

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
            ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-md'
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
                primary ? 'text-emerald-400' : 'text-slate-300'
              }`}
            />
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                primary ? 'text-emerald-800' : 'text-slate-800'
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

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  value,
  label,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor = 'text-slate-900',
  isLoading,
  animDelay = 0,
}: {
  value: number
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconBg: string
  iconColor: string
  valueColor?: string
  isLoading: boolean
  animDelay?: number
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ animation: `fade-in-up 0.5s ease-out ${animDelay}ms both` }}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className={`text-xl font-bold tabular-nums ${valueColor}`}>
          {isLoading ? '—' : value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Training in-progress card                                          */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<string, string> = {
  EXAM: 'Fazendo a prova',
  DIAGNOSIS: 'Diagnóstico',
  STUDY: 'Estudando',
  RETRY: 'Re-tentativa',
  FINAL: 'Concluído',
}

const STAGE_COLORS: Record<string, string> = {
  EXAM: 'bg-blue-100 text-blue-700',
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

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useClerkAuth()
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()
  const { data: trainings = [], isLoading: loadingTrainings } =
    useTrainingsQuery()

  const firstName = getFirstName(user?.username || user?.email)
  const greeting = getGreeting()

  // Exam stats
  const totalAttempts = historyItems.length
  const passedAttempts = historyItems.filter(
    (i) => i.passed === true,
  ).length
  const failedAttempts = historyItems.filter(
    (i) => i.finishedAt != null && i.passed !== true,
  ).length
  const recentAttempts = historyItems.slice(0, RECENT_ATTEMPTS)

  // Training stats
  const totalTrainings = trainings.length
  const concludedTrainings = trainings.filter(
    (t) => t.currentStage === 'FINAL',
  ).length
  const activeTrainings = trainings.filter(
    (t) => t.currentStage !== 'FINAL',
  )

  // Quick-action state
  const activeAttempt = historyItems.find(
    (i) => i.finishedAt == null && i.examBoardId != null,
  )

  const handleAttemptClick = (item: ExamBaseAttemptHistoryItem) => {
    if (!item.examBoardId) return
    if (item.finishedAt) {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId/feedback',
        params: {
          examBoard: item.examBoardId,
          examId: item.examBaseId,
          attemptId: item.id,
        },
      })
    } else {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: {
          examBoard: item.examBoardId,
          examId: item.examBaseId,
          attemptId: item.id,
        },
      })
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* ═══════════ WELCOME HERO ═══════════ */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-8 md:py-10 bg-linear-to-br from-slate-800 via-slate-700 to-slate-600"
        style={{ animation: 'scale-in 0.45s ease-out both' }}
      >
        {/* decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/3" />
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium">
            {greeting}
            {firstName ? ',' : ''}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1 tracking-tight">
            {firstName || 'Bem-vindo'}
          </h1>
          <p className="text-white/50 text-sm mt-2 max-w-lg">
            Acompanhe seu progresso, continue seus treinos e avance nos seus
            estudos para concursos.
          </p>
        </div>
      </div>

      {/* ═══════════ QUICK ACTIONS ═══════════ */}
      <div>
        <h2
          className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
          style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
        >
          Ações rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            to="/treino/novo"
            icon={RocketLaunchIcon}
            title="Criar novo treino"
            description="Escolha um simulado e comece a evoluir"
            accent="text-emerald-600"
            iconBg="bg-emerald-100"
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
            accent="text-blue-600"
            iconBg="bg-blue-100"
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
            description={
              totalAttempts > 0
                ? `${totalAttempts} tentativa${totalAttempts !== 1 ? 's' : ''} registrada${totalAttempts !== 1 ? 's' : ''}`
                : 'Histórico completo de tentativas'
            }
            accent="text-slate-600"
            iconBg="bg-slate-100"
            animDelay={300}
          />
        </div>
      </div>

      {/* ═══════════ STATS OVERVIEW ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Training stats */}
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-800">Treinos</h3>
            <Link
              to="/treino"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium no-underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              value={totalTrainings}
              label="Total"
              icon={AcademicCapIcon}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              isLoading={loadingTrainings}
              animDelay={350}
            />
            <StatCard
              value={concludedTrainings}
              label="Concluídos"
              icon={CheckCircleIcon}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              valueColor="text-emerald-700"
              isLoading={loadingTrainings}
              animDelay={400}
            />
            <StatCard
              value={activeTrainings.length}
              label="Em andamento"
              icon={PlayIcon}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              valueColor="text-amber-700"
              isLoading={loadingTrainings}
              animDelay={450}
            />
          </div>
        </Card>

        {/* Exam stats */}
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-800">Exames</h3>
            <Link
              to="/history"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium no-underline"
            >
              Ver histórico
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              value={totalAttempts}
              label="Tentativas"
              icon={DocumentTextIcon}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              isLoading={loadingHistory}
              animDelay={350}
            />
            <StatCard
              value={passedAttempts}
              label="Aprovados"
              icon={CheckCircleIcon}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              valueColor="text-emerald-700"
              isLoading={loadingHistory}
              animDelay={400}
            />
            <StatCard
              value={failedAttempts}
              label="Reprovados"
              icon={XCircleIcon}
              iconBg="bg-red-100"
              iconColor="text-red-500"
              valueColor="text-red-600"
              isLoading={loadingHistory}
              animDelay={450}
            />
          </div>
        </Card>
      </div>

      {/* ═══════════ ACTIVE TRAININGS ═══════════ */}
      {activeTrainings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Treinos em andamento
            </h2>
            <Link
              to="/treino"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium no-underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTrainings.slice(0, 3).map((t, idx) => {
              const stageLabel = STAGE_LABELS[t.currentStage] ?? t.currentStage
              const stageColor =
                STAGE_COLORS[t.currentStage] ?? 'bg-slate-100 text-slate-700'
              const slug = STAGE_SLUG[t.currentStage] ?? 'prova'
              const progress = STAGE_PROGRESS[t.currentStage] ?? 0

              const linkTo = getStagePath(slug, t.trainingId)

              return (
                <Link
                  key={t.trainingId}
                  to={linkTo}
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

                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2.5">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
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

      {/* ═══════════ CONTINUE EXAM CTA ═══════════ */}
      {activeAttempt && (
        <Card
          noElevation
          className="p-5 border-2 border-blue-200 bg-blue-50/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <PlayIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-800">
                  Você tem um exame em andamento
                </p>
                <p className="text-xs text-blue-600/70 truncate">
                  {activeAttempt.institution ??
                    activeAttempt.examBaseName ??
                    'Prova'}
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

      {/* ═══════════ RECENT ACTIVITY ═══════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Atividade recente
          </h2>
          {recentAttempts.length > 0 && (
            <Link
              to="/history"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium no-underline"
            >
              Ver tudo
            </Link>
          )}
        </div>

        {loadingHistory ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-slate-200/60"
              />
            ))}
          </div>
        ) : recentAttempts.length === 0 ? (
          <Card noElevation className="p-8 border border-slate-200 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Nenhuma atividade ainda
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Comece um treino ou faça um exame para ver seu progresso aqui.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Link to="/treino/novo">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    Criar treino
                  </Button>
                </Link>
                <Link to="/exams">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DocumentTextIcon className="w-4 h-4" />}
                  >
                    Ver exames
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentAttempts.map((item) => (
              <li key={item.id}>
                <AttemptListItem item={item} onClick={handleAttemptClick} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
