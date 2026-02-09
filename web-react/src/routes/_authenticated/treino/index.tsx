import { Card } from '@/components/Card'
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import { TREINO_STAGES, getStagePath, getStageBySlug } from './stages.config'
import type { TreinoStageSlug } from './stages.config'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import type { TrainingStage } from '@/features/training/domain/training.types'
import dayjs from 'dayjs'

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

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Treino</h1>
        <p className="text-sm text-slate-500 mt-1">
          Em vez de só fazer uma prova e receber feedback, o Treino é um processo completo: prova → diagnóstico → estudo → re-tentativa → resultado final.
        </p>
      </div>

      {/* Lista de treinos */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Seus treinos</h2>
        {isLoading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : trainings.length === 0 ? (
          <Card noElevation className="p-5 border border-slate-200">
            <p className="text-slate-600 text-sm">
              Você ainda não iniciou nenhum treino. Clique em &quot;Iniciar novo treino&quot; para escolher um simulado e começar.
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

      {/* Iniciar novo */}
      <Card noElevation className="p-5 border-dashed border-2 border-slate-300 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-7 h-7 text-slate-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-700">Iniciar novo treino</h3>
            <p className="text-sm text-slate-500 mt-1">
              Escolha um simulado e comece pela etapa Prova.
            </p>
          </div>
          <Link to="/treino/prova">
            <Button variant="contained" color="primary" startIcon={<ClipboardDocumentListIcon className="w-5 h-5" />}>
              Ir para Prova
            </Button>
          </Link>
        </div>
      </Card>

      {/* Resumo das etapas (colapsado / referência) */}
      <details className="group">
        <summary className="text-sm font-medium text-slate-600 cursor-pointer list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Ver etapas do treino
        </summary>
        <div className="flex flex-col gap-2 mt-2 pl-4">
          {TREINO_STAGES.map((stage) => {
            const Icon = stage.icon
            return (
              <div key={stage.id} className="flex items-center gap-2 text-sm text-slate-600">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{stage.title}</span>
                <span className="text-slate-400">— {stage.subtitle}</span>
              </div>
            )
          })}
        </div>
      </details>
    </>
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
