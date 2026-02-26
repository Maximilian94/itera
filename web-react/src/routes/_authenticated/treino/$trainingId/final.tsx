import { Card } from '@/components/Card'
import { PpTooltip } from '@/components/PpTooltip'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  SparklesIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'
import { getStagePath } from '../-stages.config'
import { useRequireTrainingStage } from '../-useRequireTrainingStage'
import {
  useTrainingQuery,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQuery } from '@tanstack/react-query'
import { trainingService } from '@/features/training/services/training.service'
import { useEffect, useState } from 'react'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/final',
)({
  component: FinalPage,
})

/* ------------------------------------------------------------------ */
/*  Animated Score Ring                                                */
/* ------------------------------------------------------------------ */

const RING_RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ScoreRing({
  percentage,
  label,
  subtitle,
  correct,
  total,
  accentColor,
  strokeColor,
  highlighted = false,
  animDelay = 0,
}: {
  percentage: number
  label: string
  subtitle: string
  correct: number
  total: number
  accentColor: string
  strokeColor: string
  highlighted?: boolean
  animDelay?: number
}) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRendered(true), animDelay + 100)
    return () => clearTimeout(t)
  }, [animDelay])

  const offset = CIRCUMFERENCE * (1 - (rendered ? percentage : 0) / 100)

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      style={{
        animation: `fade-in-up 0.6s ease-out ${animDelay}ms both`,
      }}
    >
      <div className="relative w-36 h-36 md:w-40 md:h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* track */}
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          {/* progress */}
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>
        {/* center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-bold tabular-nums ${
              highlighted ? 'text-emerald-700' : 'text-slate-700'
            }`}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <p className={`text-sm font-semibold ${accentColor}`}>{label}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <p className="text-xs text-slate-400 tabular-nums">
        {correct} de {total} questões
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Subject Comparison Row                                            */
/* ------------------------------------------------------------------ */

function SubjectRow({
  subject,
  initial,
  final: f,
  index,
}: {
  subject: string
  initial: { correct: number; total: number; percentage: number }
  final: { correct: number; total: number; percentage: number }
  index: number
}) {
  const delta = f.percentage - initial.percentage

  return (
    <div
      className="py-4 first:pt-0 last:pb-0"
      style={{
        animation: `fade-in-up 0.5s ease-out ${600 + index * 80}ms both`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">{subject}</span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            delta > 0
              ? 'bg-emerald-50 text-emerald-700'
              : delta < 0
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          {delta > 0 ? '+' : ''}
          {delta.toFixed(0)} <PpTooltip />
        </span>
      </div>

      {/* Before bar */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[0.7rem] text-slate-400 w-12 shrink-0">
          Antes
        </span>
        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-300 transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(initial.percentage, initial.percentage > 0 ? 2 : 0)}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 tabular-nums w-20 text-right">
          {initial.correct}/{initial.total} ({initial.percentage.toFixed(0)}%)
        </span>
      </div>

      {/* After bar */}
      <div className="flex items-center gap-3">
        <span className="text-[0.7rem] text-slate-400 w-12 shrink-0">
          Depois
        </span>
        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              delta > 0
                ? 'bg-emerald-500'
                : delta < 0
                  ? 'bg-red-400'
                  : 'bg-slate-400'
            }`}
            style={{
              width: `${Math.max(f.percentage, f.percentage > 0 ? 2 : 0)}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 tabular-nums w-20 text-right">
          {f.correct}/{f.total} ({f.percentage.toFixed(0)}%)
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Final Page                                                        */
/* ------------------------------------------------------------------ */

function FinalPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  useRequireTrainingStage(trainingId, 'final')

  const { data: training, isLoading: loadingTraining } =
    useTrainingQuery(trainingId)
  const { data: finalPayload, isLoading: loadingFinal } = useQuery({
    queryKey: trainingKeys.final(trainingId),
    queryFn: () => trainingService.getFinal(trainingId),
    enabled: Boolean(trainingId),
  })

  const isLoading = loadingTraining || loadingFinal
  const examTitle = training?.examTitle ?? 'Simulado'
  const feedback = finalPayload?.finalFeedback

  /* ---- skeleton loading ---- */
  if (isLoading && !finalPayload) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-52 rounded-2xl bg-slate-200/60" />
        <div className="flex justify-center gap-16">
          <div className="w-40 h-40 rounded-full bg-slate-200/60" />
          <div className="w-40 h-40 rounded-full bg-slate-200/60" />
        </div>
        <div className="h-64 rounded-xl bg-slate-200/60" />
      </div>
    )
  }

  const initialPercentage = finalPayload?.initialPercentage ?? 0
  const finalPercentage = finalPayload?.finalPercentage ?? 0
  const initialCorrect = finalPayload?.initialCorrect ?? 0
  const finalCorrect = finalPayload?.finalCorrect ?? 0
  const totalQuestions = finalPayload?.totalQuestions ?? 0
  const gainPoints = finalPayload?.gainPoints ?? 0
  const gainPercent = finalPayload?.gainPercent ?? 0
  const subjectStatsInitial = finalPayload?.subjectStatsInitial ?? []
  const subjectStatsFinal = finalPayload?.subjectStatsFinal ?? []

  const subjectComparison = (() => {
    const bySubject = new Map<
      string,
      {
        initial: (typeof subjectStatsInitial)[0]
        final: (typeof subjectStatsFinal)[0]
      }
    >()
    for (const s of subjectStatsInitial)
      bySubject.set(s.subject, { initial: s, final: undefined! })
    for (const s of subjectStatsFinal) {
      const entry = bySubject.get(s.subject)
      if (entry) entry.final = s
      else bySubject.set(s.subject, { initial: undefined!, final: s })
    }
    return Array.from(bySubject.entries()).map(
      ([subject, { initial, final }]) => ({
        subject,
        initial: initial ?? { subject, correct: 0, total: 0, percentage: 0 },
        final: final ?? { subject, correct: 0, total: 0, percentage: 0 },
      }),
    )
  })()

  const improved = gainPoints > 0

  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* ═══════════ HERO CELEBRATION BANNER ═══════════ */}
      <div
        className={`relative overflow-hidden rounded-2xl px-6 py-10 md:px-10 md:py-12 text-center ${
          improved
            ? 'bg-linear-to-br from-emerald-600 via-emerald-500 to-teal-500'
            : 'bg-linear-to-br from-slate-600 via-slate-500 to-slate-400'
        }`}
        style={{ animation: 'scale-in 0.5s ease-out both' }}
      >
        {/* decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute top-1/3 left-1/4 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute bottom-1/4 right-1/3 w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            style={{ animation: 'trophy-bounce 0.8s ease-out 0.3s both' }}
          >
            <TrophyIcon className="w-9 h-9 text-white" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {improved ? 'Parabéns! Treino concluído!' : 'Treino concluído'}
          </h1>

          <p className="text-white/80 text-sm md:text-base max-w-md">
            {examTitle}
          </p>

          {improved && (
            <div
              className="inline-flex items-center gap-2 mt-2 px-5 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.8s both' }}
            >
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span>
                +{gainPoints} {gainPoints === 1 ? 'questão' : 'questões'} ·{' '}
                +{gainPercent.toFixed(0)} <PpTooltip />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ SCORE EVOLUTION ═══════════ */}
      <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-16 py-2">
        <ScoreRing
          percentage={initialPercentage}
          label="Prova inicial"
          subtitle="Antes do estudo"
          correct={initialCorrect}
          total={totalQuestions}
          accentColor="text-slate-600"
          strokeColor="#94a3b8"
          animDelay={200}
        />

        {/* center evolution indicator */}
        <div
          className="flex flex-col items-center gap-1.5"
          style={{ animation: 'fade-in-up 0.6s ease-out 500ms both' }}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              improved ? 'bg-emerald-100' : 'bg-slate-100'
            }`}
          >
            <ArrowTrendingUpIcon
              className={`w-5 h-5 ${improved ? 'text-emerald-600' : 'text-slate-400'}`}
            />
          </div>
          <span
            className={`text-xs font-semibold ${
              improved ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            Evolução
          </span>
        </div>

        <ScoreRing
          percentage={finalPercentage}
          label="Re-tentativa"
          subtitle="Após o estudo"
          correct={finalCorrect}
          total={totalQuestions}
          accentColor="text-emerald-700"
          strokeColor="#10b981"
          highlighted
          animDelay={400}
        />
      </div>

      {/* ═══════════ SUBJECT COMPARISON ═══════════ */}
      {subjectComparison.length > 0 && (
        <Card noElevation className="p-6 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            Evolução por matéria
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Comparação de desempenho antes e depois do estudo
          </p>
          <div className="divide-y divide-slate-100">
            {subjectComparison.map(({ subject, initial, final: f }, idx) => (
              <SubjectRow
                key={subject}
                subject={subject}
                initial={initial}
                final={f}
                index={idx}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ═══════════ AI FEEDBACK ═══════════ */}
      {feedback && (
        <div style={{ animation: 'fade-in-up 0.5s ease-out 900ms both' }}>
        <Card
          noElevation
          className="p-6 border border-slate-200 bg-linear-to-br from-slate-50/80 to-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Feedback do treino
              </h3>
              <p className="text-xs text-slate-500">
                Análise personalizada da sua evolução
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed md:pl-[52px]">
            <Markdown>{feedback}</Markdown>
          </div>
        </Card>
        </div>
      )}

      {/* ═══════════ NAVIGATION ═══════════ */}
      <div className="flex flex-wrap gap-3 justify-between pt-2 pb-4">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() =>
            navigate({ to: getStagePath('retentativa', trainingId) })
          }
        >
          Voltar: Re-tentativa
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<HomeIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino' })}
        >
          Concluir e voltar ao início
        </Button>
      </div>
    </div>
  )
}
