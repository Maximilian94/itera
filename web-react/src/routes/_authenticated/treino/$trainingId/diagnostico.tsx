import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
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

export const Route = createFileRoute('/_authenticated/treino/$trainingId/diagnostico')({
  component: DiagnosticoPage,
})

function getSubjectBarColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'bg-emerald-500'
  if (percentage >= minPassing - 15) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getSubjectTextColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'text-emerald-700'
  if (percentage >= minPassing - 15) return 'text-amber-700'
  return 'text-rose-700'
}

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
      await queryClient.refetchQueries({ queryKey: trainingKeys.one(trainingId) })
      navigate({ to: getStagePath('estudo', trainingId) })
    } catch {
      // erro já tratado pela mutation
    }
  }

  if (isLoading || !training) {
    return (
      <div className="text-slate-600 text-sm">
        {isLoading ? 'Carregando...' : 'Sessão não encontrada.'}
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="flex flex-col gap-4">
        <Card noElevation className="p-6 border border-slate-200">
          <p className="text-slate-600">
            Conclua a prova e finalize para gerar o diagnóstico e o feedback por matéria.
          </p>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate({ to: getStagePath('prova', trainingId) })}
          >
            Voltar: Prova
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
    <div className="flex flex-col gap-6 overflow-y-auto min-h-0 flex-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{examTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resultado e feedback por matéria para orientar seu estudo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                passed ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              {passed ? (
                <CheckCircleIcon className="w-7 h-7 text-emerald-600" />
              ) : (
                <XCircleIcon className="w-7 h-7 text-rose-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-semibold ${passed ? 'text-emerald-800' : 'text-rose-800'}`}>
                {passed ? 'Aprovado' : 'Reprovado'}
              </p>
              <p className="text-sm text-slate-600">
                {overall.correct} de {overall.total} questões corretas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
            <TrophyIcon className="w-6 h-6 text-slate-400" />
            <span className="text-2xl font-bold text-slate-800">
              {overall.percentage.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Nota mínima (ampla concorrência): {minPassingGradeNonQuota}%
          </p>
        </Card>

        <Card noElevation className="p-5 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Desempenho por matéria
          </h3>
          <div className="flex flex-col gap-3">
            {subjectStats.map((stat) => (
              <div key={stat.subject}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{stat.subject}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getSubjectBarColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                    style={{
                      width: `${Math.min(100, stat.percentage)}%`,
                      minWidth: stat.percentage > 0 ? 6 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card noElevation className="p-5 border border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">
            Feedback e recomendações por matéria
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          {subjectStats.map((stat) => {
            const fb = subjectFeedback[stat.subject]
            if (!fb) return null
            const isAbove = stat.percentage >= minPassingGradeNonQuota
            const isBelow = stat.percentage < minPassingGradeNonQuota - 15
            const accentBorder = isAbove
              ? 'border-l-emerald-400'
              : isBelow
                ? 'border-l-rose-400'
                : 'border-l-amber-400'

            return (
              <Card
                key={stat.subject}
                noElevation
                className={`p-5 border border-slate-200 bg-white border-l-4 ${accentBorder}`}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h4 className="text-sm font-semibold text-slate-800">{stat.subject}</h4>
                  <span
                    className={`text-sm font-semibold tabular-nums ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(0)}% acertos
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Avaliação
                    </p>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      <Markdown>{fb.evaluation}</Markdown>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Recomendações de estudo
                    </p>
                    <div className="flex flex-col gap-2.5 text-sm text-slate-700">
                      {fb.recommendations?.map((rec, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-slate-800 text-sm">{rec.title}</p>
                          <div className="text-slate-600 leading-relaxed">
                            <Markdown>{rec.text}</Markdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('prova', trainingId) })}
        >
          Voltar: Prova
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={handleGoToEstudo}
          disabled={updateStageMutation.isPending}
        >
          {updateStageMutation.isPending ? 'Avançando...' : 'Próxima: Estudo'}
        </Button>
      </div>
    </div>
  )
}
