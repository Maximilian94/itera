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
 * Clicável nas fases concluídas e na atual; as futuras ficam bloqueadas. A fase
 * sendo exibida ganha um pill cyan-tint; o nó Estudo mostra o sub-progresso.
 *
 * `compact`: variante mínima para quando o stepper divide espaço com um
 * conteúdo em foco (ex.: um ponto de estudo aberto) — nós menores e só o
 * rótulo da fase exibida.
 */
export function StepperBar(props: {
  /** Estágio atual do treino (null = ainda não começou → fica na Prova). */
  currentStage: TrainingStage | null
  /** Fase sendo exibida (destacada com pill). */
  viewedSlug: TreinoStageSlug
  /** Pontos de estudo concluídos/total; mostrado no nó Estudo quando total > 0. */
  studyProgress?: { done: number; total: number }
  compact?: boolean
  onSelect: (slug: TreinoStageSlug) => void
}) {
  const { currentStage, viewedSlug, studyProgress, compact = false, onSelect } = props
  const currentIdx =
    currentStage != null ? Math.max(0, TRAINING_STAGE_ORDER.indexOf(currentStage)) : 0

  return (
    <div
      /* Morfa entre a versão cheia e a compacta na troca de nível. */
      style={{ viewTransitionName: 'treino-stepper' }}
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] ${
        compact ? 'px-2 py-1' : 'px-3 py-2 sm:px-4'
      }`}
    >
      <ol
        className="flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Etapas do treino"
      >
        {TREINO_STAGES.map((stage, i) => {
          const state: StepState =
            i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
          const selectable = state !== 'upcoming'
          const viewed = stage.slug === viewedSlug
          const sub =
            stage.slug === 'estudo' && studyProgress != null && studyProgress.total > 0
              ? `${studyProgress.done}/${studyProgress.total}`
              : null
          // Compacto: só a fase exibida mantém rótulo; as demais viram nós.
          const labelClass = compact
            ? viewed
              ? 'inline'
              : 'hidden'
            : state === 'upcoming'
              ? 'hidden sm:inline'
              : ''
          return (
            <Fragment key={stage.slug}>
              {i > 0 && (
                <li
                  aria-hidden
                  className={`h-0.5 flex-1 rounded-full ${
                    compact ? 'mx-0.5 min-w-[8px]' : 'mx-1 min-w-[14px] sm:min-w-[20px]'
                  } ${i <= currentIdx ? 'bg-cyan-600' : 'bg-slate-200'}`}
                />
              )}
              <li className="shrink-0">
                <button
                  type="button"
                  disabled={!selectable}
                  aria-current={viewed ? 'step' : undefined}
                  onClick={() => selectable && onSelect(stage.slug)}
                  className={`group flex items-center gap-2 rounded-lg transition-colors ${
                    compact ? 'px-1 py-1' : 'px-1.5 py-1.5'
                  } ${
                    viewed
                      ? 'bg-cyan-50'
                      : selectable
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'cursor-not-allowed'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500`}
                >
                  <StepNode index={i} state={state} compact={compact} />
                  <span
                    className={`whitespace-nowrap leading-none transition-colors ${
                      compact ? 'text-xs' : 'text-sm'
                    } ${
                      viewed
                        ? 'font-extrabold text-cyan-700'
                        : state === 'upcoming'
                          ? 'font-semibold text-slate-400'
                          : 'font-bold text-slate-900'
                    } ${labelClass}`}
                  >
                    {stage.title}
                    {sub != null && (
                      <span
                        className={`ml-1.5 align-middle text-xs font-bold tabular-nums ${
                          viewed ? 'text-cyan-600' : 'text-slate-500'
                        }`}
                      >
                        {sub}
                      </span>
                    )}
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

function StepNode({
  index,
  state,
  compact,
}: {
  index: number
  state: StepState
  compact: boolean
}) {
  const size = compact ? 'h-5 w-5 text-[0.62rem]' : 'h-7 w-7 text-xs'
  if (state === 'done') {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none`}
      >
        <CheckIcon className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} strokeWidth={2.5} />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-cyan-600 font-extrabold text-white ${
          compact ? 'ring-2 ring-cyan-100' : 'ring-4 ring-cyan-100'
        }`}
      >
        {index + 1}
      </span>
    )
  }
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-extrabold text-slate-500`}
    >
      {index + 1}
    </span>
  )
}
