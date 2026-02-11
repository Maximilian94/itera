import { Card } from '@/components/Card'
import {
  AcademicCapIcon,
  PlayIcon,
  TrophyIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getStagePath, getStageBySlug } from './stages.config'
import type { TreinoStageSlug } from './stages.config'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import type { TrainingStage } from '@/features/training/domain/training.types'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/PageHeader'

const STAGE_TO_SLUG: Record<TrainingStage, TreinoStageSlug> = {
  EXAM: 'prova',
  DIAGNOSIS: 'diagnostico',
  STUDY: 'estudo',
  RETRY: 'retentativa',
  FINAL: 'final',
}

export const Route = createFileRoute('/_authenticated/treino/')({
  component: TreinoIndexPage,
})

function TreinoIndexPage() {
  const { data: trainings = [], isLoading } = useTrainingsQuery()

  const total = trainings.length
  const concluded = trainings.filter((t) => t.currentStage === 'FINAL').length
  const inProgress = total - concluded

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Título */}
      <PageHeader title="Treino" />

      {/* Dashboard: cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card noElevation className="p-2 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : total}</p>
              <p className="text-sm text-slate-500">Total de treinos</p>
            </div>
          </div>
        </Card>
        <Card noElevation className="p-2 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{isLoading ? '—' : concluded}</p>
              <p className="text-sm text-slate-500">Concluídos</p>
            </div>
          </div>
        </Card>
        <Card noElevation className="p-2 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ArrowPathIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{isLoading ? '—' : inProgress}</p>
              <p className="text-sm text-slate-500">Em andamento</p>
            </div>
          </div>
        </Card>
      </div>

      {/* CTA: explicar + criar novo */}
      <Card noElevation className="p-5 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-sm text-slate-700">
                <strong>Aqui seu erro vira plano de estudo.</strong>
              </p>
              <p className="text-sm text-slate-700">
                Você entra em um ciclo de evolução:
              </p>
              <p className="text-sm text-slate-700">
                Faz a prova, recebe um diagnóstico da IA, estuda o que realmente precisa e refaz as questões que errou.
              </p>
              <p className="text-sm text-slate-700">
                No fim, você compara o antes e depois e vê o quanto evoluiu.
              </p>
            </div>
          </div>
          <Link to="/treino/prova" className="shrink-0">
            <Button variant="contained" color="primary" startIcon={<RocketLaunchIcon className="w-5 h-5" />}>
              Criar novo treino
            </Button>
          </Link>
        </div>
      </Card>

      {/* Histórico de treinos */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Histórico de treinos</h2>
        {isLoading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : trainings.length === 0 ? (
          <Card noElevation className="p-5 border border-slate-200">
            <p className="text-slate-600 text-sm">
              Você ainda não tem nenhum treino. Use o botão acima para escolher um simulado e começar.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {trainings.map((t) => (
              <TrainingRow key={t.trainingId} item={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TrainingRow({
  item,
}: {
  item: import('@/features/training/domain/training.types').TrainingListItem
}) {
  const slug = STAGE_TO_SLUG[item.currentStage]
  const stage = getStageBySlug(slug) ?? getStageBySlug('prova')
  const isFinished = item.currentStage === 'FINAL'
  const continuePath = getStagePath(slug, item.trainingId)

  return (
    <Card noElevation className="p-4 border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{item.examTitle}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 flex-wrap">
            <span>
              {dayjs(item.updatedAt).format('DD/MM/YYYY HH:mm')}
            </span>
            {stage && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stage.color}`}>
                {stage.title}
              </span>
            )}
            {isFinished && item.finalScorePercentage != null && (
              <span className="flex items-center gap-1 text-emerald-600">
                <TrophyIcon className="w-4 h-4" />
                {item.finalScorePercentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <Link to={continuePath}>
          <Button
            size="small"
            variant={isFinished ? 'outlined' : 'contained'}
            color="primary"
            startIcon={isFinished ? <TrophyIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
          >
            {isFinished ? 'Ver resultado' : 'Continuar'}
          </Button>
        </Link>
      </div>
    </Card>
  )
}
