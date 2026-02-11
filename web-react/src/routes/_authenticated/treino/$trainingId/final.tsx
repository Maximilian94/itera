import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { getStagePath } from '../stages.config'
import { useRequireTrainingStage } from '../useRequireTrainingStage'
import {
  useTrainingQuery,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQuery } from '@tanstack/react-query'
import { trainingService } from '@/features/training/services/training.service'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/final')({
  component: FinalPage,
})

function FinalPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  useRequireTrainingStage(trainingId, 'final')

  const { data: training, isLoading: loadingTraining } = useTrainingQuery(trainingId)
  const { data: finalPayload, isLoading: loadingFinal } = useQuery({
    queryKey: trainingKeys.final(trainingId),
    queryFn: () => trainingService.getFinal(trainingId),
    enabled: Boolean(trainingId),
  })

  const isLoading = loadingTraining || loadingFinal
  const examTitle = training?.examTitle ?? 'Simulado'
  const feedback = finalPayload?.finalFeedback

  if (isLoading && !training) {
    return (
      <div className="text-slate-600 text-sm">
        Carregando...
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
    const bySubject = new Map<string, { initial: typeof subjectStatsInitial[0]; final: typeof subjectStatsFinal[0] }>()
    for (const s of subjectStatsInitial) bySubject.set(s.subject, { initial: s, final: undefined! })
    for (const s of subjectStatsFinal) {
      const entry = bySubject.get(s.subject)
      if (entry) entry.final = s
      else bySubject.set(s.subject, { initial: undefined!, final: s })
    }
    return Array.from(bySubject.entries()).map(([subject, { initial, final }]) => ({
      subject,
      initial: initial ?? { subject, correct: 0, total: 0, percentage: 0 },
      final: final ?? { subject, correct: 0, total: 0, percentage: 0 },
    }))
  })()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{examTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resultado final: sua evolução da prova inicial até após o estudo e a re-tentativa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <Card noElevation className="p-5 border border-slate-200 flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
            <ChartBarIcon className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Nota inicial
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            Resultado da prova
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-3 tabular-nums">
            {initialPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {initialCorrect} de {totalQuestions} questões
          </p>
        </Card>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="w-6 h-6 text-slate-300" aria-hidden />
        </div>

        <Card noElevation className="p-5 border border-slate-200 flex flex-col border-l-4 border-l-emerald-500">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <TrophyIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Nota final
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            Após estudo e re-tentativa
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-3 tabular-nums">
            {finalPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {finalCorrect} de {totalQuestions} questões
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold w-fit">
            +{gainPoints} questões (+{gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(0)}%)
          </div>
        </Card>
      </div>

      {subjectComparison.length > 0 && (
        <Card noElevation className="p-5 border border-slate-200">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Desempenho por matéria: antes e depois
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium text-left">
                  <th className="py-2 pr-4">Matéria</th>
                  <th className="py-2 pr-4 text-center">Antes</th>
                  <th className="py-2 pr-4 text-center">Depois</th>
                  <th className="py-2 text-center">Variação</th>
                </tr>
              </thead>
              <tbody>
                {subjectComparison.map(({ subject, initial, final: f }) => {
                  const delta = f.percentage - initial.percentage
                  return (
                    <tr key={subject} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-800">{subject}</td>
                      <td className="py-3 pr-4 text-center tabular-nums text-slate-600">
                        {initial.correct}/{initial.total} ({initial.percentage.toFixed(0)}%)
                      </td>
                      <td className="py-3 pr-4 text-center tabular-nums text-slate-600">
                        {f.correct}/{f.total} ({f.percentage.toFixed(0)}%)
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={
                            delta > 0
                              ? 'text-emerald-600 font-semibold'
                              : delta < 0
                                ? 'text-red-600 font-semibold'
                                : 'text-slate-500'
                          }
                        >
                          {delta > 0 ? '+' : ''}{delta.toFixed(0)} p.p.
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {feedback && (
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Feedback final</h3>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed">
            <Markdown>{feedback}</Markdown>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('retentativa', trainingId) })}
        >
          Voltar: Re-tentativa
        </Button>
        <Button variant="contained" color="primary" onClick={() => navigate({ to: '/treino' })}>
          Concluir e voltar ao início
        </Button>
      </div>
    </div>
  )
}
