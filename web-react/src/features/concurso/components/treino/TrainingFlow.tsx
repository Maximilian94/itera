import { useState } from 'react'
import { ArrowPathIcon, ArrowRightIcon, PlayIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { CircularProgress } from '@mui/material'
import { useProgramActions } from './useProgramActions'
import { DiagnosticoEmbed, EstudoListEmbed, FinalEmbed } from './embeds'
import { StudyItemFocus } from './StudyItemFocus'
import { StepperBar } from './StepperBar'
import type { ExamAttemptFeedback } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import type {
  TrainingFinalPayload,
  TrainingListItem,
  TrainingStudyItemResponse,
} from '@/features/training/domain/training.types'
import type { TreinoStageSlug } from '@/routes/_authenticated/treino/-stages.config'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
} from '@/routes/_authenticated/treino/-stages.config'
import {
  useTrainingQuery,
  useTrainingStudyItemsQuery,
  useUpdateTrainingStageMutation,
} from '@/features/training/queries/training.queries'

const STAGE_META: Record<TreinoStageSlug, { title: string; desc: string }> = {
  prova: {
    title: 'Prova diagnóstica',
    desc: 'Responda a prova real no formato de simulado. É ela que calibra todo o seu plano.',
  },
  diagnostico: {
    title: 'Diagnóstico',
    desc: 'Onde você está forte e onde precisa focar. A página inteira é a sua leitura.',
  },
  estudo: {
    title: 'Estudar pontos fracos',
    desc: 'Cada ponto abre na página com explicação, exercícios e as questões que você errou.',
  },
  retentativa: {
    title: 'Re-tentativa',
    desc: 'Segunda chance só nas questões que você errou, sem ver o que marcou antes.',
  },
  final: {
    title: 'Resultado final',
    desc: 'Sua evolução nesta prova, do começo ao fim do ciclo.',
  },
}

/** Experiência de treino em página cheia: stepper horizontal + a fase atual. */
export function TrainingFlow(props: {
  examBaseId: string
  session: TrainingListItem | null
}) {
  const { examBaseId, session } = props
  const trainingId = session?.trainingId
  const [viewedSlug, setViewedSlug] = useState<TreinoStageSlug | null>(null)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)

  const trainingQuery = useTrainingQuery(trainingId)
  const studyItemsQuery = useTrainingStudyItemsQuery(trainingId)
  const actions = useProgramActions(examBaseId, session)
  const advanceStage = useUpdateTrainingStageMutation(trainingId ?? '')

  const stageIdx = session != null ? TRAINING_STAGE_ORDER.indexOf(session.currentStage) : -1
  const currentSlug: TreinoStageSlug = stageIdx >= 0 ? TREINO_STAGES[stageIdx].slug : 'prova'
  const viewed = viewedSlug ?? currentSlug
  const isCurrentView = viewed === currentSlug

  const studyItems = studyItemsQuery.data ?? []
  const studyProgress = {
    done: studyItems.filter((i) => i.completedAt).length,
    total: studyItems.length,
  }

  // Modo foco de um ponto de estudo: o stepper continua no topo.
  if (focusItemId != null && trainingId != null) {
    return (
      <div className="flex flex-col gap-4">
        <StepperBar
          currentStage={session?.currentStage ?? null}
          viewedSlug={viewed}
          onSelect={(s) => {
            setFocusItemId(null)
            setViewedSlug(s)
          }}
        />
        <StudyItemFocus
          trainingId={trainingId}
          studyItemId={focusItemId}
          studyProgress={studyProgress}
          onBack={() => setFocusItemId(null)}
        />
      </div>
    )
  }

  const meta = STAGE_META[viewed]

  return (
    <div className="flex flex-col gap-4">
      <StepperBar
        currentStage={session?.currentStage ?? null}
        viewedSlug={viewed}
        onSelect={setViewedSlug}
      />

      <header className="px-1">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900">
          {meta.title}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500">{meta.desc}</p>
      </header>

      <PhaseContent
        slug={viewed}
        isCurrentView={isCurrentView}
        session={session}
        actions={actions}
        advanceStage={advanceStage}
        feedback={trainingQuery.data?.feedback}
        final={trainingQuery.data?.final}
        studyItems={studyItems}
        studyLoading={studyItemsQuery.isPending && trainingId != null}
        onOpenItem={setFocusItemId}
        onAdvancedToStudy={() => setViewedSlug('estudo')}
      />

      {actions.isError && (
        <p className="px-1 text-sm text-rose-600">
          Não foi possível começar o treino agora. Verifique seu plano ou tente novamente.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Botões                                                             */
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
      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
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
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      {props.children}
    </button>
  )
}

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] sm:p-6'

/** Cartão "herói" para fases sem conteúdo embutido (prova / re-tentativa / final vazio). */
function HeroCard(props: {
  icon: React.ReactNode
  title: string
  desc: string
  actions: React.ReactNode
}) {
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
          {props.icon}
        </span>
        <div className="min-w-[12rem] flex-1">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{props.title}</h3>
          <p className="mt-0.5 max-w-prose text-sm text-slate-500">{props.desc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">{props.actions}</div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Conteúdo de cada fase (página cheia)                               */
/* ------------------------------------------------------------------ */

function PhaseContent(props: {
  slug: TreinoStageSlug
  isCurrentView: boolean
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
  const { slug, isCurrentView, session, actions, advanceStage, feedback } = props

  switch (slug) {
    case 'prova':
      if (session == null) {
        return (
          <HeroCard
            icon={<PlayIcon className="h-7 w-7" />}
            title="Comece pela prova diagnóstica"
            desc="O plano se ajusta ao seu desempenho real. Você responde em tela cheia."
            actions={
              <PrimaryBtn
                onClick={actions.start}
                loading={actions.isStarting}
                icon={<PlayIcon className="h-4 w-4" />}
              >
                Começar treino
              </PrimaryBtn>
            }
          />
        )
      }
      return (
        <HeroCard
          icon={<PlayIcon className="h-7 w-7" />}
          title={session.currentStage === 'EXAM' ? 'Continue a prova' : 'Prova concluída'}
          desc={
            session.currentStage === 'EXAM'
              ? 'Termine de responder para receber seu diagnóstico.'
              : 'Você respondeu a prova real deste cargo. Pode revisar quando quiser.'
          }
          actions={
            <GhostBtn onClick={() => actions.openStage('prova')}>
              {session.currentStage === 'EXAM' ? 'Continuar a prova' : 'Revisar a prova'}
            </GhostBtn>
          }
        />
      )

    case 'diagnostico':
      if (feedback == null) {
        return (
          <p className="px-1 text-sm text-slate-500">
            O diagnóstico aparece aqui assim que você concluir a prova.
          </p>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <DiagnosticoEmbed feedback={feedback} />
          </section>
          {isCurrentView && (
            <div className="px-1">
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('STUDY', { onSuccess: () => props.onAdvancedToStudy() })
                }
                loading={advanceStage.isPending}
                icon={<ArrowRightIcon className="h-4 w-4" />}
              >
                Ir para o estudo
              </PrimaryBtn>
            </div>
          )}
        </div>
      )

    case 'estudo':
      return (
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            {props.studyLoading ? (
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <EstudoListEmbed items={props.studyItems} onOpenItem={props.onOpenItem} />
            )}
          </section>
          {isCurrentView && (
            <div className="px-1">
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('RETRY', {
                    onSuccess: () => actions.openStage('retentativa'),
                  })
                }
                loading={advanceStage.isPending}
                icon={<ArrowRightIcon className="h-4 w-4" />}
              >
                Ir para a re-tentativa
              </PrimaryBtn>
            </div>
          )}
        </div>
      )

    case 'retentativa':
      return (
        <HeroCard
          icon={<ArrowPathIcon className="h-7 w-7" />}
          title="Refazer o que você errou"
          desc="Segunda chance nas questões erradas, sem ver o que marcou antes. Responda em tela cheia."
          actions={
            <PrimaryBtn onClick={() => actions.openStage('retentativa')} icon={<ArrowPathIcon className="h-4 w-4" />}>
              {session?.currentStage === 'RETRY' ? 'Continuar a re-tentativa' : 'Abrir re-tentativa'}
            </PrimaryBtn>
          }
        />
      )

    case 'final':
      return (
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            {props.final != null ? (
              <FinalEmbed final={props.final} />
            ) : (
              <p className="text-sm text-slate-500">
                Ao fechar o ciclo, sua linha de progresso (nota inicial → final) aparece aqui.
              </p>
            )}
          </section>
          <div className="px-1">
            <PrimaryBtn
              onClick={actions.start}
              loading={actions.isStarting}
              icon={<SparklesIcon className="h-4 w-4" />}
            >
              Começar novo ciclo
            </PrimaryBtn>
          </div>
        </div>
      )

    default:
      return null
  }
}
