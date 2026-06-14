import {
  ArrowPathIcon,
  CheckBadgeIcon,
  ClockIcon,
  InformationCircleIcon,
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
} from '@/routes/_authenticated/treino/-stages.config'

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
}

/* ------------------------------------------------------------------ */
/*  Helpers de sessão                                                  */
/* ------------------------------------------------------------------ */

/** Rótulo/variante do CTA conforme a sessão de treino daquela prova. */
function actionFor(session: TrainingListItem | null) {
  if (session == null) return { label: 'Treinar', icon: true }
  if (session.currentStage === 'FINAL') return { label: 'Treinar novamente', icon: false }
  return { label: 'Continuar', icon: true }
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

/* ================================================================== */
/*  Quadro de provas para treinar                                      */
/* ================================================================== */

export function ProvasBoard(props: {
  official: ProvaTrainOption | null
  recommended: Array<ProvaTrainOption>
  sessionByExamBase: Map<string, TrainingListItem>
  cut: number | null
  meters: boolean
  onTrain: (examBaseId: string) => void
}) {
  const { official, recommended, sessionByExamBase, cut, meters, onTrain } = props
  const firstRecommendedId = recommended[0]?.examBaseId ?? null

  return (
    <div className="flex flex-col gap-4">
      {official != null && (
        <OfficialCard
          option={official}
          session={sessionByExamBase.get(official.examBaseId) ?? null}
          cut={cut}
          meters={meters}
          firstRecommendedId={firstRecommendedId}
          onTrain={onTrain}
        />
      )}

      {recommended.length > 0 && (
        <section {...enter(2)} className={`${CARD} p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-slate-900" id="recomendadas">
            Provas recomendadas para treinar
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {official != null && official.questionCount === 0
              ? 'Provas equivalentes (mesmo cargo) enquanto a oficial não sai. Cada uma tem seu próprio ciclo e questões reais.'
              : 'Edições anteriores e provas equivalentes deste cargo. Cada uma tem seu próprio ciclo e questões reais.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommended.map((opt) => (
              <ProvaCard
                key={opt.examBaseId}
                option={opt}
                session={sessionByExamBase.get(opt.examBaseId) ?? null}
                onTrain={onTrain}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Cartão da prova OFICIAL (âncora fixa)                              */
/* ------------------------------------------------------------------ */

function OfficialCard(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  cut: number | null
  meters: boolean
  firstRecommendedId: string | null
  onTrain: (examBaseId: string) => void
}) {
  const { option, session, cut, meters, firstRecommendedId, onTrain } = props
  const hasQuestions = option.questionCount > 0
  const action = actionFor(session)

  return (
    <section
      {...enter(1)}
      className="relative overflow-hidden rounded-2xl border-[1.5px] border-cyan-200 bg-white shadow-sm"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-700" aria-hidden />
      <div className="p-5 pl-7 sm:p-6 sm:pl-8">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cyan-50 leading-none text-cyan-700">
            <span className="text-[0.78rem] font-extrabold">{option.logoTop}</span>
            <span className="text-[0.6rem] font-bold opacity-80">{option.logoBottom}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              Prova do concurso
              <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                Oficial
              </span>
            </h2>
            {option.subtitle != null && (
              <p className="mt-0.5 text-sm text-slate-500">{option.subtitle}</p>
            )}
          </div>
        </div>

        {hasQuestions ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-[8rem]">
                <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">
                  Sua prontidão nesta prova
                </p>
                <p
                  className={`text-2xl font-extrabold leading-none ${
                    option.studyPlan.bestScore != null &&
                    cut != null &&
                    option.studyPlan.bestScore >= cut
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  {option.studyPlan.bestScore != null
                    ? `${Math.round(option.studyPlan.bestScore)}%`
                    : '—'}
                </p>
              </div>
              {option.studyPlan.bestScore != null && (
                <div className="min-w-[12rem] flex-1">
                  <ReadinessBar
                    value={Math.round(option.studyPlan.bestScore)}
                    cut={cut}
                    meters={meters}
                    size="md"
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onTrain(option.examBaseId)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                {action.icon ? (
                  <PlayIcon className="h-4 w-4" />
                ) : (
                  <ArrowPathIcon className="h-4 w-4" />
                )}
                {action.label}
              </button>
              <Quota />
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex gap-3 rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3">
              <InformationCircleIcon className="h-5 w-5 shrink-0 text-cyan-700" />
              <p className="text-sm text-cyan-800">
                <span className="font-bold text-slate-900">
                  Esta prova ainda não foi aplicada
                </span>
                , então não tem questões próprias. Quando a prova sair, as questões reais
                entram aqui. Por enquanto, treine com provas equivalentes — o desempenho
                conta do mesmo jeito.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={firstRecommendedId == null}
                onClick={() => firstRecommendedId != null && onTrain(firstRecommendedId)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayIcon className="h-4 w-4" />
                Treinar com prova equivalente
              </button>
              <Quota />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Quota() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <ClockIcon className="h-4 w-4" />
      Consome 1 treino da sua cota
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Cartão de prova recomendada                                        */
/* ------------------------------------------------------------------ */

function ProvaCard(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  onTrain: (examBaseId: string) => void
}) {
  const { option, session, onTrain } = props
  const action = actionFor(session)
  const state = stateOf(session)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 leading-none text-slate-500">
          <span className="text-[0.72rem] font-extrabold">{option.logoTop}</span>
          <span className="text-[0.58rem] font-bold opacity-75">{option.logoBottom}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
            <span className="truncate">{option.title}</span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                option.kind === 'related'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-cyan-50 text-cyan-700'
              }`}
            >
              {option.kind === 'related' ? 'relacionada' : 'mesma banca'}
            </span>
          </p>
          {option.subtitle != null && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{option.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        {state != null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
              state.tone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {state.tone === 'success' && <CheckBadgeIcon className="h-3.5 w-3.5" />}
            {state.text}
          </span>
        ) : (
          <span>{option.questionCount} questões reais</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onTrain(option.examBaseId)}
        className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
          action.label === 'Treinar novamente'
            ? 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
            : 'bg-cyan-600 text-white hover:bg-cyan-700'
        }`}
      >
        {action.icon && <PlayIcon className="h-4 w-4" />}
        {action.label}
      </button>
    </div>
  )
}
