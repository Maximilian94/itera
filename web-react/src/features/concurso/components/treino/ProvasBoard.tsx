import {
  ArrowPathIcon,
  CheckBadgeIcon,
  ClockIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import type { StudyPlan } from '@/features/concurso/domain/concurso.types'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import { CARD } from '@/features/concurso/components/card'
import { enter } from '@/features/concurso/components/motion'
import { ReadinessBar } from '@/features/concurso/components/ReadinessBar'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
} from '@/features/training/domain/stages.config'

/** Uma prova que pode ser treinada: a oficial do concurso ou uma recomendada. */
export type ProvaTrainOption = {
  examBaseId: string
  /** Banca da própria prova (relacionadas tier 2 são de outra banca). */
  examBoardId: string | null
  studyPlan: StudyPlan
  questionCount: number
  kind: 'official' | 'own' | 'related'
  /** Linha principal (ex.: "IBFC · 2024"). */
  title: string
  /** Linha secundária (ex.: instituição). */
  subtitle: string | null
  /** Selo do logo: sigla da banca + ano. */
  logoTop: string
  logoBottom: string
  /** Por que esta prova está aqui (chip): "mesma banca", "outra banca", "este concurso". */
  badge: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers de sessão e recomendação                                   */
/* ------------------------------------------------------------------ */

/** Rótulo/variante do CTA conforme a sessão de treino daquela prova. */
function actionFor(session: TrainingListItem | null) {
  if (session == null) return { label: 'Treinar', restart: false }
  if (session.currentStage === 'FINAL') return { label: 'Treinar novamente', restart: true }
  return { label: 'Continuar', restart: false }
}

/** Selo de estado (em andamento / concluído) a partir da sessão. */
function stateOf(session: TrainingListItem | null): {
  text: string
  tone: 'progress' | 'success'
} | null {
  if (session == null) return null
  if (session.currentStage === 'FINAL') {
    const score =
      session.finalScorePercentage != null ? ` · ${Math.round(session.finalScorePercentage)}%` : ''
    return { text: `Ciclo concluído${score}`, tone: 'success' }
  }
  const idx = TRAINING_STAGE_ORDER.indexOf(session.currentStage)
  const stage = idx >= 0 ? TREINO_STAGES[idx] : undefined
  return { text: `Em andamento · ${stage?.title ?? ''}`, tone: 'progress' }
}

/**
 * O coach escolhe UMA prova para treinar agora:
 * 1. sessão em andamento (retomar vence tudo);
 * 2. a oficial, quando tem questões;
 * 3. a primeira opção nunca treinada;
 * 4. senão, a primeira da fila (treinar novamente).
 */
function pickRecommendation(
  official: ProvaTrainOption | null,
  recommended: Array<ProvaTrainOption>,
  sessionByExamBase: Map<string, TrainingListItem>,
): ProvaTrainOption | null {
  const trainable = [
    ...(official != null && official.questionCount > 0 ? [official] : []),
    ...recommended,
  ]
  if (trainable.length === 0) return null
  const inProgress = trainable.find((o) => {
    const s = sessionByExamBase.get(o.examBaseId)
    return s != null && s.currentStage !== 'FINAL'
  })
  if (inProgress != null) return inProgress
  if (official != null && official.questionCount > 0) return official
  return trainable.find((o) => sessionByExamBase.get(o.examBaseId) == null) ?? trainable[0]
}

/** Motivo curto da recomendação, dito como um treinador diria. */
function reasonFor(option: ProvaTrainOption, session: TrainingListItem | null): string {
  if (session != null && session.currentStage !== 'FINAL')
    return 'Você tem um ciclo em andamento nesta prova. Retome de onde parou.'
  if (option.kind === 'official') return 'É a prova real deste concurso, com as questões que valem.'
  if (option.kind === 'own') return 'Outra prova deste mesmo concurso, com questões reais.'
  if (option.badge === 'mesma banca')
    return 'Mesmo cargo e mesma banca: o formato mais próximo da sua prova.'
  return 'Mesmo cargo em outra banca: bom volume de questões reais para praticar.'
}

/* ================================================================== */
/*  Mesa do treinador: 1 card de ação + lista de outras provas        */
/* ================================================================== */

export function ProvasBoard(props: {
  official: ProvaTrainOption | null
  recommended: Array<ProvaTrainOption>
  sessionByExamBase: Map<string, TrainingListItem>
  cut: number | null
  meters: boolean
  /** Prova cujo título morfa card ↔ h1 do treino (view transition). */
  morphExamBaseId?: string | null
  onTrain: (examBaseId: string) => void
}) {
  const { official, recommended, sessionByExamBase, cut, meters, morphExamBaseId, onTrain } =
    props

  const officialTrainable = official != null && official.questionCount > 0
  const pick = pickRecommendation(official, recommended, sessionByExamBase)
  const pickIsOfficial = pick != null && official != null && pick.examBaseId === official.examBaseId
  const others = recommended.filter((o) => o.examBaseId !== pick?.examBaseId)

  return (
    <div className="flex flex-col gap-4">
      {/* A oficial só ganha card próprio quando é treinável; futura sem
       * questões vira uma nota dentro do "Treine agora" (menos camadas). */}
      {officialTrainable && (
        <GoalCard
          option={official}
          session={sessionByExamBase.get(official.examBaseId) ?? null}
          cut={cut}
          meters={meters}
          isRecommendation={pickIsOfficial}
          morph={morphExamBaseId === official.examBaseId}
          onTrain={onTrain}
        />
      )}

      {pick != null && !pickIsOfficial && (
        <TrainNowStrip
          option={pick}
          session={sessionByExamBase.get(pick.examBaseId) ?? null}
          officialPending={official != null && !officialTrainable}
          morph={morphExamBaseId === pick.examBaseId}
          onTrain={onTrain}
        />
      )}

      {others.length > 0 && (
        <section {...enter(2)} className={`${CARD} p-4 sm:p-5`} aria-labelledby="outras-provas">
          <h2 id="outras-provas" className="text-base font-bold text-slate-900">
            Outras provas para treinar
          </h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {others.map((opt) => (
              <ProvaRow
                key={opt.examBaseId}
                option={opt}
                session={sessionByExamBase.get(opt.examBaseId) ?? null}
                morph={morphExamBaseId === opt.examBaseId}
                onTrain={onTrain}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Selo de banca + ano                                                */
/* ------------------------------------------------------------------ */

function BancaSeal(props: { top: string; bottom: string; size?: 'md' | 'lg'; accent?: boolean }) {
  const { top, bottom, size = 'md', accent = false } = props
  const box = size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-10 w-10 rounded-lg'
  const tone = accent ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-600'
  return (
    <span
      aria-hidden
      className={`flex ${box} shrink-0 flex-col items-center justify-center leading-none ${tone}`}
    >
      <span className={size === 'lg' ? 'text-[0.78rem] font-extrabold' : 'text-[0.68rem] font-extrabold'}>
        {top}
      </span>
      <span className={size === 'lg' ? 'text-[0.6rem] font-bold opacity-80' : 'text-[0.54rem] font-bold opacity-75'}>
        {bottom}
      </span>
    </span>
  )
}

function Quota() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <ClockIcon className="h-4 w-4" />
      Consome 1 treino da sua cota
    </span>
  )
}

function TrainButton(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  onTrain: (examBaseId: string) => void
  variant?: 'primary' | 'ghost'
}) {
  const { option, session, onTrain, variant = 'primary' } = props
  const action = actionFor(session)
  const tone =
    variant === 'primary'
      ? 'bg-cyan-600 px-5 py-2.5 text-white hover:bg-cyan-700'
      : 'border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
  return (
    <button
      type="button"
      aria-label={`${action.label}: ${option.title}`}
      onClick={() => onTrain(option.examBaseId)}
      className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${tone}`}
    >
      {action.restart ? <ArrowPathIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      {action.label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Prova do concurso: meta + ação num card só                         */
/* ------------------------------------------------------------------ */

function GoalCard(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  cut: number | null
  meters: boolean
  /** Quando a oficial é a própria recomendação, o CTA primário mora aqui. */
  isRecommendation: boolean
  /** O título morfa até o h1 do treino (view transition). */
  morph: boolean
  onTrain: (examBaseId: string) => void
}) {
  const { option, session, cut, meters, isRecommendation, morph, onTrain } = props
  const score = option.studyPlan.bestScore != null ? Math.round(option.studyPlan.bestScore) : null
  const passing = score != null && cut != null && score >= cut
  const delta =
    option.studyPlan.scoreDelta != null ? Math.round(option.studyPlan.scoreDelta) : null

  return (
    <section {...enter(1)} className={`${CARD} p-4 sm:p-5`} aria-labelledby="meta-prova">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <BancaSeal top={option.logoTop} bottom={option.logoBottom} size="lg" accent />
        <div className="min-w-0 flex-1 basis-40">
          <h2
            id="meta-prova"
            style={morph ? { viewTransitionName: 'prova-title' } : undefined}
            className="w-fit text-base font-extrabold text-slate-900"
          >
            Prova do concurso
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {option.questionCount} questões reais
            {cut != null && ` · corte ${cut}%`}
          </p>
        </div>

        {/* Prontidão inline: nota grande + barra vs corte + leitura curta. */}
        {score != null && (
          <div className="flex w-full items-center gap-3 sm:w-64">
            <p
              className={`text-2xl font-extrabold leading-none tabular-nums ${
                passing ? 'text-emerald-600' : 'text-slate-900'
              }`}
            >
              {score}%
            </p>
            <div className="min-w-0 flex-1">
              <ReadinessBar value={score} cut={cut} meters={meters} size="sm" />
              <p className="mt-1 text-xs text-slate-500">
                {passing
                  ? 'acima do corte'
                  : cut != null
                    ? `faltam ${cut - score} pts`
                    : 'sua melhor nota'}
                {delta != null && delta > 0 && (
                  <span className="font-semibold text-emerald-700"> · +{delta} pts</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {isRecommendation && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <TrainButton option={option} session={session} onTrain={onTrain} />
          {score == null && (
            <span className="text-sm text-slate-600">
              A prova diagnóstica mede sua prontidão.
            </span>
          )}
          <Quota />
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Treine agora: a recomendação única do coach                        */
/* ------------------------------------------------------------------ */

function TrainNowStrip(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  /** A prova oficial existe mas ainda não saiu → nota explicativa aqui. */
  officialPending: boolean
  /** O título morfa até o h1 do treino (view transition). */
  morph: boolean
  onTrain: (examBaseId: string) => void
}) {
  const { option, session, officialPending, morph, onTrain } = props
  const state = stateOf(session)

  return (
    <section
      {...enter(1)}
      className="rounded-2xl border-[1.5px] border-cyan-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] sm:p-5"
      aria-labelledby="treine-agora"
    >
      <h2 id="treine-agora" className="text-base font-extrabold text-slate-900">
        Treine agora
      </h2>
      <p className="mt-0.5 max-w-prose text-sm text-slate-600">
        {officialPending ? (
          <>
            <span className="font-bold text-slate-900">
              Esta prova ainda não foi aplicada
            </span>
            , então não tem questões próprias. {reasonFor(option, session)} O desempenho
            conta do mesmo jeito.
          </>
        ) : (
          reasonFor(option, session)
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <BancaSeal top={option.logoTop} bottom={option.logoBottom} />
        <div className="min-w-0 flex-1 basis-40">
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <span
              className="truncate"
              style={morph ? { viewTransitionName: 'prova-title' } : undefined}
            >
              {option.title}
            </span>
            {option.badge != null && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-bold text-slate-600">
                {option.badge}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {option.subtitle != null ? `${option.subtitle} · ` : ''}
            {option.questionCount} questões reais
          </p>
        </div>
        <TrainButton option={option} session={session} onTrain={onTrain} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {state != null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              state.tone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {state.tone === 'success' && <CheckBadgeIcon className="h-3.5 w-3.5" />}
            {state.text}
          </span>
        ) : (
          <Quota />
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Linha de prova (lista ranqueada, não grid de cards)                */
/* ------------------------------------------------------------------ */

function ProvaRow(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  /** O título morfa até o h1 do treino (view transition). */
  morph: boolean
  onTrain: (examBaseId: string) => void
}) {
  const { option, session, morph, onTrain } = props
  const state = stateOf(session)
  const score = option.studyPlan.bestScore != null ? Math.round(option.studyPlan.bestScore) : null

  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
      <BancaSeal top={option.logoTop} bottom={option.logoBottom} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span
            className="truncate"
            style={morph ? { viewTransitionName: 'prova-title' } : undefined}
          >
            {option.title}
          </span>
          {option.badge != null && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-bold text-slate-600">
              {option.badge}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {option.subtitle != null ? `${option.subtitle} · ` : ''}
          {option.questionCount} questões
        </p>
      </div>

      {state != null ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            state.tone === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {state.tone === 'success' && <CheckBadgeIcon className="h-3.5 w-3.5" />}
          {state.text}
        </span>
      ) : (
        score != null && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
            prontidão {score}%
          </span>
        )
      )}

      <TrainButton option={option} session={session} onTrain={onTrain} variant="ghost" />
    </li>
  )
}
