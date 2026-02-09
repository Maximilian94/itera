import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  SparklesIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES, getStagePath } from '../stages.config'
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
  const stage = getStageById(5)!

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
  const beforeStudyPercentage = finalPayload?.beforeStudyPercentage ?? finalPayload?.initialPercentage ?? 0
  const finalPercentage = finalPayload?.finalPercentage ?? 0
  const initialCorrect = finalPayload?.initialCorrect ?? 0
  const finalCorrect = finalPayload?.finalCorrect ?? 0
  const totalQuestions = finalPayload?.totalQuestions ?? 0
  const gainPoints = finalPayload?.gainPoints ?? 0
  const gainPercent = finalPayload?.gainPercent ?? 0

  return (
    <>
      <div
        className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}
          >
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Etapa {TREINO_STAGES.length} de {TREINO_STAGES.length}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800">{examTitle}</h2>

      <p className="text-slate-600 text-sm">
        Sua evolução neste treino: da nota da prova até o resultado após estudo e
        re-tentativa das questões erradas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-slate-200 bg-slate-50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <ChartBarIcon className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Nota inicial
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            Resultado da prova
          </p>
          <p className="text-3xl font-bold text-slate-700 mt-3">
            {initialPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {initialCorrect} de {totalQuestions} questões
          </p>
        </Card>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="w-8 h-8 text-slate-300" aria-hidden />
        </div>

        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <ChartBarIcon className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Antes dos estudos
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            Mesmo resultado (diagnóstico)
          </p>
          <p className="text-3xl font-bold text-amber-700 mt-3">
            {beforeStudyPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {initialCorrect} de {totalQuestions} questões
          </p>
        </Card>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="w-8 h-8 text-emerald-400 shrink-0" aria-hidden />
        </div>

        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <TrophyIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Nota final
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            Depois do estudo e re-tentativa
          </p>
          <p className="text-3xl font-bold text-emerald-700 mt-3">
            {finalPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {finalCorrect} de {totalQuestions} questões
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-200 text-emerald-800 text-sm font-semibold">
            <span>+{gainPoints} questões</span>
            <span className="text-emerald-600">(+{gainPercent.toFixed(0)}%)</span>
          </div>
        </Card>
      </div>

      <Card
        noElevation
        className="p-5 border-2 border-emerald-200 bg-emerald-50/80 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
          <TrophyIcon className="w-7 h-7 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Treino concluído</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Você melhorou {gainPercent.toFixed(0)} pontos percentuais após o estudo e a
            re-tentativa. Continue assim nos próximos treinos.
          </p>
        </div>
      </Card>

      {training?.examBaseId && (
        <div className="flex flex-wrap gap-3 items-center">
          <Link to="/exams">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DocumentTextIcon className="w-5 h-5" />}
            >
              Ver as questões
            </Button>
          </Link>
          <span className="text-sm text-slate-500">
            Acesse o exame para revisar as questões deste treino.
          </span>
        </div>
      )}

      {feedback && (
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Feedback final</h3>
          </div>
          <div className="text-sm text-slate-700">
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
    </>
  )
}
