import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { TreinoStepper } from './treino/-TreinoStepper'
import { TREINO_STAGES } from './treino/-stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'
import { useExamBaseQuery } from '@/features/examBase/queries/examBase.queries'
import { formatExamBaseTitle } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/treino')({
  component: TreinoLayout,
})

function deriveTrainingIdFromPath(pathname: string): string | undefined {
  const after = pathname.replace(/^\/treino\/?/, '')
  const first = after.split('/')[0]
  if (!first) return undefined
  if (first === 'novo') return 'novo'
  const isStageSlug = TREINO_STAGES.some((s) => s.slug === first)
  if (isStageSlug) return undefined
  return first
}

function TreinoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const trainingId = deriveTrainingIdFromPath(pathname)
  const { data: training } = useTrainingQuery(trainingId === 'novo' ? undefined : trainingId)
  const { data: examBase } = useExamBaseQuery(training?.examBaseId)
  const currentStage = training?.currentStage
  const examTitle = examBase ? formatExamBaseTitle(examBase) : null

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-1">
      {examTitle && trainingId != null && trainingId !== 'novo' && (
        <div className="shrink-0 flex items-center px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-sm font-semibold text-slate-800 truncate" title={examTitle}>
            {examTitle}
          </p>
        </div>
      )}
      {trainingId != null && (
        <div className="shrink-0">
          <TreinoStepper trainingId={trainingId} currentStage={currentStage} />
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col pb-4">
        <Outlet />
      </div>
    </div>
  )
}
