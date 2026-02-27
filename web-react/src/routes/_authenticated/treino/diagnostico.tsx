import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { getStageById, TREINO_STAGES, getStagePath } from './-stages.config'
import {
  useTrainingsQuery,
  useTrainingQuery,
  useUpdateTrainingStageMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/treino/diagnostico')({
  component: DiagnosticoPage,
})

function getSubjectBarColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'bg-green-500'
  if (percentage >= minPassing - 15) return 'bg-amber-500'
  return 'bg-rose-500'
}

function getSubjectTextColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'text-green-700'
  if (percentage >= minPassing - 15) return 'text-amber-700'
  return 'text-rose-700'
}

function DiagnosticoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const stage = getStageById(2)!

  const { data: trainings = [], isLoading: loadingList } = useTrainingsQuery()
  const trainingId =
    trainings.length > 0
      ? [...trainings].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0].trainingId
      : undefined
  const { data: training, isLoading: loadingTraining } = useTrainingQuery(trainingId)
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId ?? '')
  const feedback = training?.feedback

  const handleGoToEstudo = async () => {
    if (!trainingId) return
    try {
      await updateStageMutation.mutateAsync('STUDY')
      await queryClient.refetchQueries({ queryKey: trainingKeys.one(trainingId) })
      navigate({ to: getStagePath('estudo', trainingId) })
    } catch {
      // erro já tratado pela mutation
    }
  }

  if (loadingList || (trainingId && loadingTraining)) {
    return (
      <div className="text-slate-600 text-sm">
        Carregando...
      </div>
    )
  }

  if (!trainingId || trainings.length === 0) {
    return (
      <>
        <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
              <ChartBarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Etapa 2 de {TREINO_STAGES.length}</p>
              <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
              <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
            </div>
          </div>
        </div>
        <Card noElevation className="p-6">
          <p className="text-slate-600">
            Você ainda não iniciou nenhum treino. Inicie um treino para fazer a prova e ver seu diagnóstico.
          </p>
          <Button
            component={Link}
            to="/treino"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Ir para Treino
          </Button>
        </Card>
      </>
    )
  }

  if (!training) {
    return (
      <div className="text-slate-600 text-sm">Sessão não encontrada.</div>
    )
  }

  if (!feedback) {
    return (
      <>
        <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
              <ChartBarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Etapa 2 de {TREINO_STAGES.length}</p>
              <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
              <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
            </div>
          </div>
        </div>
        <Card noElevation className="p-6">
          <p className="text-slate-600">
            Conclua a prova e finalize para gerar o diagnóstico e o feedback por matéria.
          </p>
        </Card>
        <div className="flex flex-wrap gap-3 justify-between mt-4">
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate({ to: getStagePath('prova', trainingId) })}
          >
            Voltar: Prova
          </Button>
        </div>
      </>
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
    <>
      <h2 className="text-lg font-semibold text-slate-800">{examTitle}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          noElevation
          className={`p-6 ${
            passed
              ? 'border-green-300 bg-green-50'
              : 'border-rose-300 bg-rose-50'
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {passed ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-200">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-200">
                  <XCircleIcon className="w-8 h-8 text-rose-600" />
                </div>
              )}
              <div>
                <p
                  className={`text-lg font-semibold ${
                    passed ? 'text-green-800' : 'text-rose-800'
                  }`}
                >
                  {passed ? 'Aprovado' : 'Reprovado'}
                </p>
                <p className="text-sm text-slate-600">
                  {overall.correct} de {overall.total} questões corretas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-8 h-8 text-slate-400" />
              <span className="text-3xl font-bold text-slate-800">
                {overall.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
            Nota mínima para aprovação (ampla concorrência):{' '}
            {minPassingGradeNonQuota}%
          </p>
        </Card>

        <Card noElevation className="p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Desempenho por matéria
          </h3>
          <div className="flex flex-col gap-4">
            {subjectStats.map((stat) => (
              <div key={stat.subject}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    {stat.subject}
                  </span>
                  <span
                    className={`text-sm font-semibold ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-400 ease-out ${getSubjectBarColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                    style={{
                      width: `${Math.min(100, stat.percentage)}%`,
                      minWidth: stat.percentage > 0 ? 8 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Feedback e recomendações por matéria
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {subjectStats.map((stat) => {
            const fb = subjectFeedback[stat.subject]
            if (!fb) return null
            const isGreen = stat.percentage >= minPassingGradeNonQuota
            const isRed = stat.percentage < minPassingGradeNonQuota - 15
            const cardBorder = isGreen
              ? 'border-green-200'
              : isRed
                ? 'border-rose-200'
                : 'border-amber-200'
            const cardBg = isGreen
              ? 'bg-green-50/50'
              : isRed
                ? 'bg-rose-50/50'
                : 'bg-amber-50/50'
            return (
              <Card
                key={stat.subject}
                noElevation
                className={`p-5 border-2 ${cardBorder} ${cardBg} overflow-hidden rounded-lg`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {stat.subject}
                  </h4>
                  <span
                    className={`text-sm font-semibold ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(0)}% acertos
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Avaliação
                    </p>
                    <div className="text-sm text-slate-700">
                      <Markdown>{fb.evaluation}</Markdown>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Recomendações de estudo
                    </p>
                    <div className="flex flex-col gap-3 text-sm text-slate-700">
                      {fb.recommendations?.map((rec, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-slate-800 mb-0.5">{rec.title}</p>
                          <div className="text-slate-700">
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
      </div>

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
    </>
  )
}
