import { useState } from 'react'
import { ArrowPathIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { CircularProgress } from '@mui/material'
import { useProgramActions } from './useProgramActions'
import { DiagnosticoEmbed, EstudoListEmbed, FinalEmbed } from './embeds'
import { StudyItemFocus } from './StudyItemFocus'
import type {
  TrainingFinalPayload,
  TrainingListItem,
  TrainingStudyItemResponse,
} from '@/features/training/domain/training.types'
import type { ExamAttemptFeedback } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import { CollapsibleCard } from '@/features/concurso/components/CollapsibleCard'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
} from '@/routes/_authenticated/treino/-stages.config'
import {
  useTrainingQuery,
  useTrainingStudyItemsQuery,
  useUpdateTrainingStageMutation,
} from '@/features/training/queries/training.queries'

type PhaseState = 'done' | 'current' | 'upcoming'

/** Cronograma guiado onde cada fase abre seu conteúdo real aqui mesmo. */
export function PlanPhases(props: {
  examBaseId: string
  session: TrainingListItem | null
  cut: number | null
}) {
  const { examBaseId, session } = props
  const trainingId = session?.trainingId
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)

  const trainingQuery = useTrainingQuery(trainingId)
  const studyItemsQuery = useTrainingStudyItemsQuery(trainingId)
  const actions = useProgramActions(examBaseId, session)
  const advanceStage = useUpdateTrainingStageMutation(trainingId ?? '')

  const stageIdx = session != null ? TRAINING_STAGE_ORDER.indexOf(session.currentStage) : -1
  const isFinished = session?.currentStage === 'FINAL'
  const doneCount = isFinished ? TREINO_STAGES.length : Math.max(0, stageIdx)

  // Fase aberta por padrão = a atual (ou Prova, quando ainda não há treino).
  const currentSlug = stageIdx >= 0 ? TREINO_STAGES[stageIdx].slug : 'prova'
  const effectiveOpen = openSlug ?? currentSlug

  const studyItems = studyItemsQuery.data ?? []
  const studyProgress = {
    done: studyItems.filter((i) => i.completedAt).length,
    total: studyItems.length,
  }

  // Modo foco: um item de estudo assume a área inteira (continua na página).
  if (focusItemId != null && trainingId != null) {
    return (
      <StudyItemFocus
        trainingId={trainingId}
        studyItemId={focusItemId}
        studyProgress={studyProgress}
        onBack={() => setFocusItemId(null)}
      />
    )
  }

  function phaseStateOf(i: number): PhaseState {
    if (stageIdx < 0) return i === 0 ? 'current' : 'upcoming'
    if (i < stageIdx) return 'done'
    if (i === stageIdx) return 'current'
    return 'upcoming'
  }

  return (
    <CollapsibleCard
      title="Seu treino, do começo ao fim"
      subtitle="Cada etapa abre aqui mesmo — faça a prova, leia o diagnóstico, estude, refaça o que errou e meça a evolução."
      enterIdx={2}
      aside={
        <span className="text-xs font-semibold text-cyan-700">
          {doneCount} de {TREINO_STAGES.length} etapas
        </span>
      }
    >
      <div>
        {TREINO_STAGES.map((stage, i) => {
          const state = phaseStateOf(i)
          const isOpen = effectiveOpen === stage.slug && state !== 'upcoming'
          const isLast = i === TREINO_STAGES.length - 1
          return (
            <div key={stage.slug} className="relative border-t border-slate-100 first:border-t-0">
              {/* trilho vertical conectando os nós */}
              {!isLast && (
                <span className="absolute left-[15px] top-[46px] bottom-0 w-px bg-slate-200" aria-hidden />
              )}
              <button
                type="button"
                onClick={() =>
                  state === 'upcoming'
                    ? undefined
                    : setOpenSlug(isOpen ? '__none__' : stage.slug)
                }
                aria-expanded={isOpen}
                disabled={state === 'upcoming'}
                className={`flex w-full items-center gap-3.5 py-4 text-left ${
                  state === 'upcoming' ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <PhaseNode index={i} state={state} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`flex flex-wrap items-center gap-2 text-sm font-bold ${
                      state === 'upcoming'
                        ? 'text-slate-400'
                        : state === 'current'
                          ? 'text-cyan-700'
                          : 'text-slate-900'
                    }`}
                  >
                    {stage.title}
                    {state === 'current' && (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[0.62rem] font-bold text-cyan-700">
                        Você está aqui
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      state === 'upcoming' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {stage.subtitle}
                  </span>
                </span>
                <PhaseStatus state={state} />
                {state !== 'upcoming' && (
                  <ChevronRightIcon
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </button>

              {isOpen && (
                <div className="pb-5 pl-[42px] pr-1">
                  <PhaseBody
                    slug={stage.slug}
                    state={state}
                    session={session}
                    actions={actions}
                    advanceStage={advanceStage}
                    feedback={trainingQuery.data?.feedback}
                    final={trainingQuery.data?.final}
                    studyItems={studyItems}
                    studyLoading={studyItemsQuery.isPending && trainingId != null}
                    onOpenItem={(id) => setFocusItemId(id)}
                    onAdvancedToStudy={() => setOpenSlug('estudo')}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {actions.isError && (
        <p className="mt-3 text-sm text-rose-600">
          Não foi possível começar o treino agora. Verifique seu plano ou tente novamente.
        </p>
      )}
    </CollapsibleCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Nó + status                                                        */
/* ------------------------------------------------------------------ */

function PhaseNode({ index, state }: { index: number; state: PhaseState }) {
  if (state === 'done') {
    return (
      <span className="z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className="z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white ring-4 ring-cyan-100">
        {index + 1}
      </span>
    )
  }
  return (
    <span className="z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-bold text-slate-400">
      {index + 1}
    </span>
  )
}

function PhaseStatus({ state }: { state: PhaseState }) {
  const map = {
    done: { label: 'Feito', cls: 'bg-emerald-50 text-emerald-700' },
    current: { label: 'Você está aqui', cls: 'bg-cyan-50 text-cyan-700' },
    upcoming: { label: 'A seguir', cls: 'bg-slate-100 text-slate-500' },
  } as const
  const { label, cls } = map[state]
  return (
    <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold sm:inline ${cls}`}>
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Corpo de cada fase                                                 */
/* ------------------------------------------------------------------ */

function PrimaryBtn(props: {
  onClick: () => void
  children: React.ReactNode
  loading?: boolean
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.loading}
      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-wait disabled:opacity-70"
    >
      {props.loading ? <CircularProgress size={15} color="inherit" /> : props.icon}
      {props.children}
    </button>
  )
}

function GhostBtn(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
    >
      {props.children}
    </button>
  )
}

function PhaseBody(props: {
  slug: string
  state: PhaseState
  session: TrainingListItem | null
  actions: ReturnType<typeof useProgramActions>
  advanceStage: ReturnType<typeof useUpdateTrainingStageMutation>
  feedback: ExamAttemptFeedback | undefined
  final: TrainingFinalPayload | undefined
  studyItems: Array<TrainingStudyItemResponse>
  studyLoading: boolean
  onOpenItem: (id: string) => void
  onAdvancedToStudy: () => void
}) {
  const { slug, state, session, actions, advanceStage } = props
  const hint = 'text-sm text-slate-500'

  switch (slug) {
    /* ---- Prova ---- */
    case 'prova':
      if (session == null) {
        // A ação de começar é o "próximo passo" focal acima — aqui só o contexto.
        return (
          <p className={hint}>
            Tudo começa pela prova diagnóstica — use o botão{' '}
            <span className="font-semibold text-slate-700">Começar treino</span> acima.
            O plano se ajusta ao seu desempenho real.
          </p>
        )
      }
      return (
        <div className="flex flex-col gap-3">
          <p className={hint}>
            {state === 'current'
              ? 'Termine de responder a prova para receber seu diagnóstico.'
              : 'Você respondeu a prova real deste cargo. Pode revisar quando quiser.'}
          </p>
          <div>
            <GhostBtn onClick={() => actions.openStage('prova')}>
              {state === 'current' ? 'Continuar a prova' : 'Revisar a prova'}
            </GhostBtn>
          </div>
        </div>
      )

    /* ---- Diagnóstico ---- */
    case 'diagnostico':
      if (props.feedback == null) {
        return (
          <p className={hint}>
            O diagnóstico aparece aqui assim que você concluir a prova.
          </p>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          <DiagnosticoEmbed feedback={props.feedback} />
          {state === 'current' && (
            <div>
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('STUDY', { onSuccess: () => props.onAdvancedToStudy() })
                }
                loading={advanceStage.isPending}
              >
                Ir para o estudo
              </PrimaryBtn>
            </div>
          )}
        </div>
      )

    /* ---- Estudo ---- */
    case 'estudo':
      if (props.studyLoading) {
        return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      }
      return (
        <div className="flex flex-col gap-4">
          <EstudoListEmbed items={props.studyItems} onOpenItem={props.onOpenItem} />
          <div className="flex flex-wrap gap-2">
            {state === 'current' && (
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('RETRY', {
                    onSuccess: () => actions.openStage('retentativa'),
                  })
                }
                loading={advanceStage.isPending}
              >
                Ir para a re-tentativa
              </PrimaryBtn>
            )}
          </div>
        </div>
      )

    /* ---- Re-tentativa ---- */
    case 'retentativa':
      return (
        <div className="flex flex-col gap-3">
          <p className={hint}>
            Segunda chance nas questões que você errou, sem ver o que marcou antes — pra
            fixar o que estudou.
          </p>
          <div>
            <GhostBtn onClick={() => actions.openStage('retentativa')}>
              <ArrowPathIcon className="h-4 w-4" />
              {state === 'current' ? 'Continuar a re-tentativa' : 'Abrir re-tentativa'}
            </GhostBtn>
          </div>
        </div>
      )

    /* ---- Final ---- */
    case 'final':
      // O CTA "Começar novo ciclo" é o próximo passo focal acima; aqui só o resultado.
      return props.final != null ? (
        <FinalEmbed final={props.final} />
      ) : (
        <p className={hint}>
          Ao fechar o ciclo, sua linha de progresso (nota inicial → final) aparece aqui.
        </p>
      )

    default:
      return null
  }
}
