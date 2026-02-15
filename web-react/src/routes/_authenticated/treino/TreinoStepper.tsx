import { Link, useRouterState } from '@tanstack/react-router'
import { Fragment } from 'react'
import { HomeIcon } from '@heroicons/react/24/outline'
import { Tooltip } from '@mui/material'
import {
  TREINO_STAGES,
  getStagePath,
  getAllowedStageIndex,
  type TreinoStageSlug,
} from './stages.config'
import type { TrainingStage } from '@/features/training/domain/training.types'

const TRAINING_STAGE_PATHS: Record<TreinoStageSlug, `/treino/$trainingId/${TreinoStageSlug}`> = {
  prova: '/treino/$trainingId/prova',
  diagnostico: '/treino/$trainingId/diagnostico',
  estudo: '/treino/$trainingId/estudo',
  retentativa: '/treino/$trainingId/retentativa',
  final: '/treino/$trainingId/final',
}

export function TreinoStepper({
  trainingId,
  currentStage,
}: {
  trainingId?: string
  /** From API: current stage of the training. Used to disable stages ahead. */
  currentStage?: TrainingStage
}) {
  const router = useRouterState()
  const pathname = router.location.pathname
  const allowedStageIndex =
    currentStage != null ? getAllowedStageIndex(currentStage) : TREINO_STAGES.length - 1

  const basePath = trainingId ? `/treino/${trainingId}` : '/treino'
  const currentIndex = (() => {
    if (pathname === '/treino' || pathname === basePath) return -1
    const segment = trainingId
      ? pathname.replace(new RegExp(`^/treino/${trainingId}/?`), '').split('/')[0]
      : pathname.replace(/^\/treino\/?/, '').split('/')[0]
    const idx = TREINO_STAGES.findIndex((s) => s.slug === segment)
    return idx >= 0 ? idx : -1
  })()

  return (
    <nav
      className="flex flex-wrap items-center gap-2 sm:gap-0 sm:flex-nowrap border border-slate-300 rounded-lg bg-slate-50 p-2"
      aria-label="Etapas do treino"
    >
      {trainingId === 'novo' ? (
        <Link
          to="/treino/novo"
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
            currentIndex === -1
              ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-400'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <HomeIcon className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Início</span>
          <span className="sm:hidden">1</span>
        </Link>
      ) : trainingId ? (
        <Tooltip
          title="Você já escolheu o concurso e iniciou o treino. O início não está disponível após a criação."
          arrow
          placement="bottom"
        >
          <span
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 cursor-not-allowed opacity-70 shrink-0"
            aria-disabled
          >
            <HomeIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Início</span>
            <span className="sm:hidden">1</span>
          </span>
        </Tooltip>
      ) : (
        <Link
          to="/treino"
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
            currentIndex === -1
              ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-400'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <HomeIcon className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Início</span>
          <span className="sm:hidden">1</span>
        </Link>
      )}
      {TREINO_STAGES.map((stage, index) => {
        const isActive = currentIndex === index
        const isPast = currentIndex > index
        const isCreateMode = trainingId === 'novo'
        const isLocked = isCreateMode || (trainingId != null && index > allowedStageIndex)
        const isAvailable = !isLocked
        const StageIcon = isAvailable ? stage.iconSolid : stage.icon
        const iconColorClass = isAvailable ? (isActive ? 'text-white' : stage.iconColor) : ''
        const linkClass = `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
          isActive
            ? `${stage.activeBg} text-white ring-1 ring-offset-1 ring-slate-400`
            : isLocked
              ? 'text-slate-400 cursor-not-allowed opacity-70'
              : isPast
                ? 'text-slate-600 hover:bg-slate-200 bg-slate-100'
                : 'text-slate-500 hover:bg-slate-200'
        }`
        return (
          <Fragment key={stage.id}>
            <div
              className="hidden sm:block w-6 h-0.5 shrink-0 bg-slate-300"
              aria-hidden
            />
            {isLocked ? (
              <Tooltip
                title={
                  isCreateMode
                    ? 'Selecione um concurso e clique em "Criar e avançar" para continuar.'
                    : currentStage != null && allowedStageIndex >= 0
                      ? `Conclua a etapa "${TREINO_STAGES[allowedStageIndex].title}" para desbloquear "${stage.title}".`
                      : 'Conclua as etapas anteriores para desbloquear.'
                }
                arrow
                placement="bottom"
              >
                <span className={linkClass} aria-disabled>
                  <StageIcon className={`w-4 h-4 shrink-0 ${iconColorClass}`} />
                  <span className="hidden md:inline">{stage.title}</span>
                  <span className="md:hidden">{stage.id}</span>
                </span>
              </Tooltip>
            ) : (
              <Link
                to={trainingId ? TRAINING_STAGE_PATHS[stage.slug] : getStagePath(stage.slug)}
                params={trainingId ? { trainingId } : undefined}
                className={linkClass}
                aria-current={isActive ? 'step' : undefined}
              >
                <StageIcon className={`w-4 h-4 shrink-0 ${iconColorClass}`} />
                <span className="hidden md:inline">{stage.title}</span>
                <span className="md:hidden">{stage.id}</span>
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
