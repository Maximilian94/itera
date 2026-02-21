import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button, CircularProgress } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { getStagePath } from '../stages.config'
import { useRequireTrainingStage } from '../useRequireTrainingStage'
import {
  useTrainingQuery,
  useUpdateTrainingStageMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/diagnostico',
)({
  component: DiagnosticoPage,
})

/* ------------------------------------------------------------------ */
/*  Score Ring (same pattern as final page)                            */
/* ------------------------------------------------------------------ */

const RING_RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ScoreRing({
  percentage,
  passed,
  animDelay = 0,
}: {
  percentage: number
  passed: boolean
  animDelay?: number
}) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRendered(true), animDelay + 100)
    return () => clearTimeout(t)
  }, [animDelay])

  const offset = CIRCUMFERENCE * (1 - (rendered ? percentage : 0) / 100)
  const strokeColor = passed ? '#10b981' : '#f43f5e'

  return (
    <div
      className="relative w-32 h-32 md:w-36 md:h-36"
      style={{ animation: `fade-in-up 0.6s ease-out ${animDelay}ms both` }}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-2xl md:text-3xl font-bold tabular-nums ${
            passed ? 'text-emerald-700' : 'text-slate-50'
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Subject bar                                                        */
/* ------------------------------------------------------------------ */

function SubjectBar({
  subject,
  percentage,
  correct,
  total,
  minPassing,
  index,
}: {
  subject: string
  percentage: number
  correct: number
  total: number
  minPassing: number
  index: number
}) {
  const isAbove = percentage >= minPassing
  const isClose = !isAbove && percentage >= minPassing - 15

  const barColor = isAbove
    ? 'bg-emerald-500'
    : isClose
      ? 'bg-amber-500'
      : 'bg-rose-500'

  const badgeColor = isAbove
    ? 'bg-emerald-50 text-emerald-700'
    : isClose
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-600'

  return (
    <div
      className="py-3 first:pt-0 last:pb-0"
      style={{
        animation: `fade-in-up 0.4s ease-out ${400 + index * 60}ms both`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-800">{subject}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 tabular-nums">
            {correct}/{total}
          </span>
          <span
            className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${badgeColor}`}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        {/* Passing threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-slate-400/40 z-10"
          style={{ left: `${Math.min(100, minPassing)}%` }}
        />
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{
            width: `${Math.min(100, percentage)}%`,
            minWidth: percentage > 0 ? 6 : 0,
          }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function DiagnosticoPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useRequireTrainingStage(trainingId, 'diagnostico')
  const { data: training, isLoading } = useTrainingQuery(trainingId)
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId)
  const feedback = training?.feedback

  const handleGoToEstudo = async () => {
    try {
      await updateStageMutation.mutateAsync('STUDY')
      await queryClient.refetchQueries({
        queryKey: trainingKeys.one(trainingId),
      })
      navigate({ to: getStagePath('estudo', trainingId) })
    } catch {
      // erro já tratado pela mutation
    }
  }

  /* ---- loading ---- */
  if (isLoading || !training) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-52 rounded-2xl bg-slate-200/60" />
        <div className="h-64 rounded-xl bg-slate-200/60" />
        <div className="h-48 rounded-xl bg-slate-200/60" />
      </div>
    )
  }

  /* ---- no feedback yet ---- */
  if (!feedback) {
    return (
      <div className="flex flex-col gap-6">
        <Card noElevation className="p-8 border border-slate-200 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Diagnóstico não disponível
            </p>
            <p className="text-xs text-slate-500">
              Conclua a prova e finalize para gerar o diagnóstico e o feedback
              por matéria.
            </p>
          </div>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate({ to: getStagePath('prova', trainingId) })}
          >
            Revisar a prova
          </Button>
        </div>
      </div>
    )
  }

  const {
    examTitle,
    minPassingGradeNonQuota,
    overall,
    passed,
    subjectStats,
    subjectFeedback,
  } = feedback

  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* ═══════════ HERO RESULT BANNER ═══════════ */}
      <div
        className={`relative overflow-hidden rounded-2xl px-6 py-8 md:px-8 md:py-10 ${
          passed
            ? 'bg-linear-to-br from-emerald-600 via-emerald-500 to-teal-500'
            : 'bg-linear-to-br from-rose-600 via-rose-500 to-pink-500'
        }`}
        style={{ animation: 'scale-in 0.45s ease-out both' }}
      >
        {/* decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {passed ? (
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="text-lg font-bold text-white">
                {passed ? 'Aprovado!' : 'Reprovado'}
              </span>
            </div>
            <p className="text-white/70 text-sm max-w-md">{examTitle}</p>
            <div className="flex items-center gap-4 mt-4">
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {overall.correct}/{overall.total}
                </p>
                <p className="text-[0.65rem] text-white/60 font-medium uppercase tracking-wide">
                  Questões certas
                </p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {minPassingGradeNonQuota}%
                </p>
                <p className="text-[0.65rem] text-white/60 font-medium uppercase tracking-wide">
                  Nota de corte
                </p>
              </div>
            </div>
          </div>

          {/* Right: score ring */}
          <ScoreRing
            percentage={overall.percentage}
            passed={passed}
            animDelay={200}
          />
        </div>
      </div>

      {/* ═══════════ SUBJECT PERFORMANCE ═══════════ */}
      <Card noElevation className="p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-slate-800">
            Desempenho por matéria
          </h3>
          <span className="text-[0.65rem] text-slate-400">
            Linha = nota de corte ({minPassingGradeNonQuota}%)
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Veja como você se saiu em cada matéria da prova
        </p>
        <div className="divide-y divide-slate-100">
          {subjectStats.map((stat, idx) => (
            <SubjectBar
              key={stat.subject}
              subject={stat.subject}
              percentage={stat.percentage}
              correct={stat.correct}
              total={stat.total}
              minPassing={minPassingGradeNonQuota}
              index={idx}
            />
          ))}
        </div>
      </Card>

      {/* ═══════════ AI FEEDBACK PER SUBJECT ═══════════ */}
      <div>
        <div
          className="flex items-center gap-2 mb-4"
          style={{ animation: 'fade-in-up 0.5s ease-out 600ms both' }}
        >
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Feedback e recomendações
            </h2>
            <p className="text-xs text-slate-500">
              Análise personalizada da IA por matéria
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {subjectStats.map((stat, idx) => {
            const fb = subjectFeedback[stat.subject]
            if (!fb) return null

            const isAbove = stat.percentage >= minPassingGradeNonQuota
            const isBelow = stat.percentage < minPassingGradeNonQuota - 15
            const accentBorder = isAbove
              ? 'border-l-emerald-400'
              : isBelow
                ? 'border-l-rose-400'
                : 'border-l-amber-400'
            const accentBg = isAbove
              ? 'bg-emerald-50'
              : isBelow
                ? 'bg-red-50'
                : 'bg-amber-50'
            const accentText = isAbove
              ? 'text-emerald-700'
              : isBelow
                ? 'text-red-600'
                : 'text-amber-700'

            return (
              <div
                key={stat.subject}
                style={{
                  animation: `fade-in-up 0.4s ease-out ${700 + idx * 60}ms both`,
                }}
              >
                <Card
                  noElevation
                  className={`p-5 border border-slate-200 bg-white border-l-4 ${accentBorder}`}
                >
                  {/* Subject header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {stat.subject}
                    </h4>
                    <span
                      className={`text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full ${accentBg} ${accentText}`}
                    >
                      {stat.percentage.toFixed(0)}% acertos
                    </span>
                  </div>

                  {/* Evaluation */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Avaliação
                    </p>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      <Markdown>{fb.evaluation}</Markdown>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {fb.recommendations && fb.recommendations.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Recomendações de estudo
                      </p>
                      <div className="flex flex-col gap-3">
                        {fb.recommendations.map((rec, recIdx) => (
                          <div
                            key={recIdx}
                            className="flex gap-3 items-start"
                          >
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                              <BookOpenIcon className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-sm">
                                {rec.title}
                              </p>
                              <div className="text-slate-600 text-sm leading-relaxed">
                                <Markdown>{rec.text}</Markdown>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <div className="flex flex-wrap gap-3 justify-between pt-2">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('prova', trainingId) })}
        >
          Revisar a prova
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          endIcon={
            updateStageMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )
          }
          onClick={handleGoToEstudo}
          disabled={updateStageMutation.isPending}
        >
          {updateStageMutation.isPending ? 'Avançando...' : 'Ir para o estudo'}
        </Button>
      </div>
    </div>
  )
}
