import { Suspense, lazy, useState } from 'react'
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  PlayIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
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
import type { TreinoStageSlug } from '@/features/training/domain/stages.config'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
} from '@/features/training/domain/stages.config'
import {
  useTrainingQuery,
  useTrainingStudyItemsQuery,
  useUpdateTrainingStageMutation,
} from '@/features/training/queries/training.queries'

/* O player de questões é pesado (ExamAttemptPlayer): entra no bundle só
 * quando alguém realmente vai responder uma prova/re-tentativa. */
const ProvaPlayerEmbed = lazy(() =>
  import('./EmbeddedPlayer').then((m) => ({ default: m.ProvaPlayerEmbed })),
)
const RetryPlayerEmbed = lazy(() =>
  import('./EmbeddedPlayer').then((m) => ({ default: m.RetryPlayerEmbed })),
)

const PLAYER_FALLBACK = (
  <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" aria-hidden />
)

/** Ordem visual dos pontos de estudo (mesma da lista: matéria A→Z). */
export function orderStudyItems(
  items: Array<TrainingStudyItemResponse>,
): Array<TrainingStudyItemResponse> {
  return [...items].sort(
    (a, b) => a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id),
  )
}

/** Experiência de treino em página cheia: stepper horizontal + a fase atual. */
export function TrainingFlow(props: {
  examBaseId: string
  session: TrainingListItem | null
  /** Nº de questões da prova (contexto da fase Prova). */
  questionCount?: number
  /** Nota de corte do cargo (%, contexto das fases). */
  cut?: number | null
  /** Ponto de estudo em foco (estado vive no CargoContent: o header da página
   *  vira o ponto e o breadcrumb desce para "← Estudo"). */
  focusItemId: string | null
  /** Item cujo título morfa lista ↔ header (view transition). */
  morphItemId?: string | null
  onFocusItem: (id: string | null) => void
}) {
  const { examBaseId, session, questionCount, cut, focusItemId, morphItemId, onFocusItem } =
    props
  const trainingId = session?.trainingId
  const [viewedSlug, setViewedSlug] = useState<TreinoStageSlug | null>(null)

  const trainingQuery = useTrainingQuery(trainingId)
  const studyItemsQuery = useTrainingStudyItemsQuery(trainingId)
  const actions = useProgramActions(examBaseId)
  const advanceStage = useUpdateTrainingStageMutation(trainingId ?? '')

  const stageIdx = session != null ? TRAINING_STAGE_ORDER.indexOf(session.currentStage) : -1
  const currentSlug: TreinoStageSlug = stageIdx >= 0 ? TREINO_STAGES[stageIdx].slug : 'prova'
  const viewed = viewedSlug ?? currentSlug
  const isCurrentView = viewed === currentSlug

  const studyItems = orderStudyItems(studyItemsQuery.data ?? [])
  const studyProgress = {
    done: studyItems.filter((i) => i.completedAt).length,
    total: studyItems.length,
  }

  // Modo foco de um ponto de estudo: stepper compacto (o conteúdo é o foco).
  if (focusItemId != null && trainingId != null) {
    return (
      <div className="flex flex-col gap-4">
        <StepperBar
          compact
          currentStage={session?.currentStage ?? null}
          viewedSlug={viewed}
          studyProgress={studyProgress}
          onSelect={(s) => {
            onFocusItem(null)
            setViewedSlug(s)
          }}
        />
        <StudyItemFocus
          key={focusItemId}
          trainingId={trainingId}
          studyItemId={focusItemId}
          onBack={() => onFocusItem(null)}
        />
      </div>
    )
  }

  /* Fases de responder questões (prova/re-tentativa) embutem o player, que
   * precisa de altura de app: a cadeia inteira vira flex-1/min-h-0 e o scroll
   * passa a ser interno do player (o ancestral CargoPage acompanha via
   * `has-[[data-exam-player]]`). */
  const playing =
    session != null && (viewed === 'prova' || viewed === 'retentativa')
  const fill = playing ? ' min-h-0 flex-1' : ''

  return (
    <div className={`flex flex-col gap-4${fill}`}>
      <StepperBar
        currentStage={session?.currentStage ?? null}
        viewedSlug={viewed}
        studyProgress={studyProgress}
        onSelect={setViewedSlug}
      />

      {/* A troca de fase re-entra com o mesmo gesto do resto da página; o
       * título da fase mora dentro do card do conteúdo (sem header solto). */}
      <div
        key={viewed}
        className={`flex animate-[fade-in-up_300ms_cubic-bezier(0.2,0.8,0.2,1)_both] flex-col gap-4 motion-reduce:animate-none${fill}`}
      >
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
          questionCount={questionCount}
          cut={cut}
          morphItemId={morphItemId}
          onOpenItem={onFocusItem}
          onView={setViewedSlug}
        />
      </div>

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

const CARD =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] sm:p-6'

/** Título da fase dentro do card do conteúdo (nada de header solto na página). */
function PhaseHeader(props: { title: string; desc: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{props.title}</h2>
      <p className="mt-0.5 max-w-prose text-sm text-slate-500">{props.desc}</p>
    </header>
  )
}

/** Cartão "herói" da fase Prova antes do treino existir. */
function HeroCard(props: {
  icon: React.ReactNode
  title: string
  desc: string
  /** Fatos curtos que dizem o que espera o usuário (nº de questões, corte…). */
  facts?: Array<string>
  actions: React.ReactNode
}) {
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
          {props.icon}
        </span>
        <div className="min-w-[12rem] flex-1">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{props.title}</h2>
          <p className="mt-0.5 max-w-prose text-sm text-slate-600">{props.desc}</p>
          {props.facts != null && props.facts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {props.facts.map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  {f}
                </li>
              ))}
            </ul>
          )}
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
  questionCount: number | undefined
  cut: number | null | undefined
  morphItemId?: string | null
  onOpenItem: (id: string) => void
  onView: (slug: TreinoStageSlug) => void
}) {
  const { slug, isCurrentView, session, actions, advanceStage, feedback, onView } = props

  switch (slug) {
    case 'prova': {
      // Com sessão, a prova é respondida AQUI (player embutido) — em andamento
      // ou finalizada (revisão). Sem sessão, o convite para começar.
      if (session != null) {
        return (
          <Suspense fallback={PLAYER_FALLBACK}>
            <ProvaPlayerEmbed
              trainingId={session.trainingId}
              onSeeDiagnostico={() => onView('diagnostico')}
            />
          </Suspense>
        )
      }
      const facts: Array<string> = []
      if (props.questionCount != null && props.questionCount > 0)
        facts.push(`${props.questionCount} questões reais`)
      if (props.cut != null) facts.push(`corte ${props.cut}%`)
      facts.push('formato da banca, aqui na página')
      return (
        <HeroCard
          icon={<ClipboardDocumentListIcon className="h-7 w-7" />}
          title="Prova diagnóstica"
          desc="Responda a prova real no formato de simulado. É ela que calibra todo o seu plano."
          facts={facts}
          actions={
            <PrimaryBtn
              onClick={() => actions.start()}
              loading={actions.isStarting}
              icon={<PlayIcon className="h-4 w-4" />}
            >
              Começar treino
            </PrimaryBtn>
          }
        />
      )
    }

    case 'diagnostico':
      if (feedback == null) {
        return (
          <section className={CARD}>
            <PhaseHeader
              title="Diagnóstico"
              desc="Onde você está forte e onde precisa focar."
            />
            <p className="text-sm text-slate-500">
              O diagnóstico aparece aqui assim que você concluir a prova.
            </p>
          </section>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <PhaseHeader
              title="Diagnóstico"
              desc="Onde você está forte e onde precisa focar."
            />
            <DiagnosticoEmbed feedback={feedback} />
          </section>
          {isCurrentView && (
            <div className="px-1">
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('STUDY', { onSuccess: () => onView('estudo') })
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
            <PhaseHeader
              title="Estudar pontos fracos"
              desc="Cada ponto abre na página com explicação, exercícios e as questões que você errou."
            />
            {props.studyLoading ? (
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <EstudoListEmbed
                items={props.studyItems}
                morphItemId={props.morphItemId}
                onOpenItem={props.onOpenItem}
              />
            )}
          </section>
          {isCurrentView && (
            <div className="px-1">
              <PrimaryBtn
                onClick={() =>
                  advanceStage.mutate('RETRY', {
                    onSuccess: () => onView('retentativa'),
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
      // A re-tentativa também é respondida aqui (player em modo retry).
      if (session == null) return null
      return (
        <Suspense fallback={PLAYER_FALLBACK}>
          <RetryPlayerEmbed
            trainingId={session.trainingId}
            onFinal={() => onView('final')}
          />
        </Suspense>
      )

    case 'final':
      return (
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <PhaseHeader
              title="Resultado final"
              desc="Sua evolução nesta prova, do começo ao fim do ciclo."
            />
            {props.final != null ? (
              <FinalEmbed final={props.final} />
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FlagIcon className="h-6 w-6" />
                </span>
                <p className="max-w-prose text-sm text-slate-600">
                  Ao fechar o ciclo, sua linha de progresso (nota inicial → final) aparece aqui.
                </p>
              </div>
            )}
          </section>
          <div className="px-1">
            <PrimaryBtn
              onClick={() => actions.start(() => onView('prova'))}
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
