import { Fragment } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import type { TrainingStage } from '@/features/training/domain/training.types'
import type { TreinoStageSlug } from '@/routes/_authenticated/treino/-stages.config'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
} from '@/routes/_authenticated/treino/-stages.config'

type StepState = 'done' | 'current' | 'upcoming'

/**
 * Stepper horizontal compacto das 5 fases do treino. Mono-cyan (progresso é o
 * acento), nó pequeno + rótulo inline, conectores preenchidos até a fase atual.
 * Clicável nas fases concluídas e na atual; as futuras ficam bloqueadas.
 */
export function StepperBar(props: {
  /** Estágio atual do treino (null = ainda não começou → fica na Prova). */
  currentStage: TrainingStage | null
  /** Fase sendo exibida (destacada com sublinhado). */
  viewedSlug: TreinoStageSlug
  onSelect: (slug: TreinoStageSlug) => void
}) {
  const { currentStage, viewedSlug, onSelect } = props
  const currentIdx =
    currentStage != null ? Math.max(0, TRAINING_STAGE_ORDER.indexOf(currentStage)) : 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] sm:px-4">
      <ol
        className="flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Etapas do treino"
      >
        {TREINO_STAGES.map((stage, i) => {
          const state: StepState =
            i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
          const selectable = state !== 'upcoming'
          const viewed = stage.slug === viewedSlug
          return (
            <Fragment key={stage.slug}>
              {i > 0 && (
                <li
                  aria-hidden
                  className={`h-0.5 min-w-[14px] flex-1 rounded-full sm:min-w-[20px] ${
                    i <= currentIdx ? 'bg-cyan-600' : 'bg-slate-200'
                  } mx-1`}
                />
              )}
              <li className="shrink-0">
                <button
                  type="button"
                  disabled={!selectable}
                  aria-current={viewed ? 'step' : undefined}
                  onClick={() => selectable && onSelect(stage.slug)}
                  className={`group flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors ${
                    selectable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500`}
                >
                  <StepNode index={i} state={state} />
                  <span
                    className={`whitespace-nowrap text-sm leading-none transition-colors ${
                      viewed
                        ? 'font-extrabold text-cyan-700'
                        : state === 'upcoming'
                          ? 'font-semibold text-slate-400'
                          : 'font-bold text-slate-900'
                    } ${state === 'upcoming' ? 'hidden sm:inline' : ''}`}
                  >
                    {stage.title}
                  </span>
                </button>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

function StepNode({ index, state }: { index: number; state: StepState }) {
  if (state === 'done') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition-transform group-hover:-translate-y-0.5">
        <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-extrabold text-white ring-4 ring-cyan-100">
        {index + 1}
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-extrabold text-slate-400">
      {index + 1}
    </span>
  )
}
