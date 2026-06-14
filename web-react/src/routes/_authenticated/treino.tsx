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
  const concursoSlug = examBase?.concurso?.slug ?? null
  const cargoSlug = examBase?.slug ?? null
  // Concurso = contexto (ano/local/instituição + banca); Cargo = o papel (role) com rótulo da prova.
  const bancaLabel = examBase?.examBoard?.alias ?? examBase?.examBoard?.name ?? null
  const concursoLabel =
    examTitle && bancaLabel ? `${examTitle} · ${bancaLabel}` : examTitle
  const cargoLabel = examBase
    ? [examBase.role, examBase.provaLabel].filter(Boolean).join(' · ')
    : null

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-1">
      {trainingId != null && (
        <div className="shrink-0">
          <TreinoStepper
            trainingId={trainingId}
            currentStage={currentStage}
            examTitle={trainingId !== 'novo' ? examTitle : null}
            concursoSlug={trainingId !== 'novo' ? concursoSlug : null}
            cargoSlug={trainingId !== 'novo' ? cargoSlug : null}
            concursoLabel={concursoLabel}
            cargoLabel={cargoLabel}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col pb-4">
        <Outlet />
      </div>
    </div>
  )
}
