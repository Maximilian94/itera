import { Link, useRouterState } from '@tanstack/react-router'
import { Fragment } from 'react'
import { ArrowTopRightOnSquareIcon, HomeIcon } from '@heroicons/react/24/outline'
import { ViewfinderCircleIcon } from '@heroicons/react/24/solid'
import { Tooltip } from '@mui/material'
import {
  TREINO_STAGES,
  getStagePath,
  getAllowedStageIndex,
  type TreinoStageSlug,
} from './-stages.config'
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
  examTitle,
  concursoSlug,
  cargoSlug,
  concursoLabel,
  cargoLabel,
}: {
  trainingId?: string
  /** From API: current stage of the training. Used to disable stages ahead. */
  currentStage?: TrainingStage
  /** Concurso label shown as a caption above the steps (fallback when no breadcrumb slugs). */
  examTitle?: string | null
  /** Slug do concurso (nível 1) — torna o breadcrumb navegável. */
  concursoSlug?: string | null
  /** Slug do cargo (nível 2) — torna o breadcrumb navegável. */
  cargoSlug?: string | null
  /** Rótulo do concurso no breadcrumb (ex.: "2026 · São José dos Campos/SP · Prefeitura"). */
  concursoLabel?: string | null
  /** Rótulo do cargo no breadcrumb (ex.: "Enfermeiro"). */
  cargoLabel?: string | null
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

  // Faixa de missão navegável quando temos os slugs; senão cai no rótulo plano (examTitle).
  const hasBreadcrumb = Boolean(concursoSlug && cargoSlug)

  return (
    <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
      {hasBreadcrumb ? (
        <div className="flex items-center gap-2.5 border-b border-cyan-100 bg-cyan-50/70 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-600">
            <ViewfinderCircleIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-cyan-700">
              Treinando para
            </p>
            <Link
              to="/concursos/$concursoSlug/$cargoSlug"
              params={{ concursoSlug: concursoSlug!, cargoSlug: cargoSlug! }}
              className="group inline-flex max-w-full items-center gap-1 font-bold text-slate-900 hover:text-cyan-700"
              title={cargoLabel ?? undefined}
            >
              <span className="truncate">{cargoLabel ?? 'Cargo'}</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-cyan-600" />
            </Link>
            {concursoLabel ? (
              <Link
                to="/concursos/$concursoSlug"
                params={{ concursoSlug: concursoSlug! }}
                className="block truncate text-xs text-slate-500 hover:text-cyan-700 hover:underline"
                title={concursoLabel}
              >
                {concursoLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : examTitle ? (
        <p
          className="border-b border-slate-200 px-3 py-2 text-[13px] font-semibold text-sky-900 truncate"
          title={examTitle}
        >
          {examTitle}
        </p>
      ) : null}
      <nav
        className="flex flex-wrap items-center gap-2 sm:gap-0 sm:flex-nowrap p-2"
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
      ) : trainingId && concursoSlug && cargoSlug ? (
        <Tooltip title="Voltar para a página do cargo" arrow placement="bottom">
          <Link
            to="/concursos/$concursoSlug/$cargoSlug"
            params={{ concursoSlug, cargoSlug }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
          >
            <HomeIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Cargo</span>
            <span className="sm:hidden">1</span>
          </Link>
        </Tooltip>
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
    </div>
  )
}
