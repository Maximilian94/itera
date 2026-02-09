import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AcademicCapIcon } from '@heroicons/react/24/outline'
import { TreinoStepper } from './treino/TreinoStepper'
import { TREINO_STAGES } from './treino/stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'

export const Route = createFileRoute('/_authenticated/treino')({
  component: TreinoLayout,
})

function deriveTrainingIdFromPath(pathname: string): string | undefined {
  const after = pathname.replace(/^\/treino\/?/, '')
  const first = after.split('/')[0]
  if (!first) return undefined
  const isStageSlug = TREINO_STAGES.some((s) => s.slug === first)
  return isStageSlug ? undefined : first
}

function TreinoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const trainingId = deriveTrainingIdFromPath(pathname)
  const { data: training } = useTrainingQuery(trainingId)
  const currentStage = training?.currentStage

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-1">
      {/* WIP Banner */}
      <div className="shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
          <AcademicCapIcon className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-amber-800">Work in progress</h2>
          <p className="text-xs text-amber-700">
            Fluxo do Treino em construção — apenas UX/UI para validação.
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <TreinoStepper trainingId={trainingId} currentStage={currentStage} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto pb-4">
        <Outlet />
      </div>
    </div>
  )
}
