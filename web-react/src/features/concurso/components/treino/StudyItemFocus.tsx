import { useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { CircularProgress } from '@mui/material'
import type { TrainingStudyItemExercise } from '@/features/training/domain/training.types'
import type {QuestionWithFeedback} from '@/components/QuestionWithFeedbackDisplay';
import { Markdown } from '@/components/Markdown'
import {
  
  QuestionWithFeedbackDisplay
} from '@/components/QuestionWithFeedbackDisplay'
import {
  useCompleteStudyItemMutation,
  useGenerateStudyItemContentMutation,
  useRetryQuestionsWithFeedbackForStudyQuery,
  useTrainingStudyItemsQuery,
} from '@/features/training/queries/training.queries'
import { BackSquare } from '@/features/concurso/components/BackSquare'

type Tab = 'rec' | 'exp' | 'exe' | 'err'

/* ------------------------------------------------------------------ */
/*  Navegador 1/N (exercícios e questões erradas)                      */
/* ------------------------------------------------------------------ */

const NAV_BTN =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Contador + anterior/próxima, no mesmo vocabulário dos ghost buttons do app.
 * Uma linha enxuta, sem divisor próprio — o caller decide onde ela mora
 * (solta acima do conteúdo ou embutida numa linha de abas via `toolbar`).
 */
function Navigator(props: {
  /** Substantivo do que se navega ("Exercício", "Questão"). */
  noun: string
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
  className?: string
}) {
  const { noun, current, total, onPrev, onNext, className } = props
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
        {noun}{' '}
        <span className="tabular-nums">
          {current + 1} <span className="font-normal text-slate-500">de {total}</span>
        </span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          aria-label={`${noun} anterior`}
          className={NAV_BTN}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={current === total - 1}
          aria-label={`Próxima ${noun.toLowerCase()}`}
          className={NAV_BTN}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bloco de exercício (responde inline, revela acerto/erro)           */
/* ------------------------------------------------------------------ */

function ExerciseBlock(props: {
  exercise: TrainingStudyItemExercise
  selectedId: string | undefined
  onSelect: (id: string) => void
}) {
  const { exercise, selectedId, onSelect } = props
  const alts = [...exercise.alternatives].sort((a, b) =>
    (a.key || '').localeCompare(b.key || ''),
  )
  const answered = selectedId != null

  return (
    <div className="flex flex-col gap-5">
      <div className="text-base leading-relaxed text-slate-900">
        <Markdown>{exercise.statement}</Markdown>
      </div>
      <div className="flex flex-col gap-2.5">
        {alts.map((alt) => {
          const isSelected = selectedId === alt.id
          const isWrong = answered && isSelected && !alt.isCorrect
          const tone = answered
            ? alt.isCorrect
              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
              : isWrong
                ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-200'
                : 'border-slate-200 bg-slate-50'
            : isSelected
              ? 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          const keyTone = answered
            ? alt.isCorrect
              ? 'bg-emerald-500 text-white'
              : isWrong
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200 text-slate-600'
            : isSelected
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-100 text-slate-600'
          return (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSelect(alt.id)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${tone}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${keyTone}`}
              >
                {alt.key}
              </span>
              <span className="flex-1 pt-1 text-sm text-slate-800">
                <Markdown>{alt.text}</Markdown>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Painel de foco                                                     */
/* ------------------------------------------------------------------ */

export function StudyItemFocus(props: {
  trainingId: string
  studyItemId: string
  onBack: () => void
}) {
  const { trainingId, studyItemId, onBack } = props
  const [tab, setTab] = useState<Tab>('rec')
  const [exIdx, setExIdx] = useState(0)
  const [wrongIdx, setWrongIdx] = useState(0)
  const [selectedByExercise, setSelectedByExercise] = useState<Record<string, string>>({})

  const { data: items = [] } = useTrainingStudyItemsQuery(trainingId)
  const { data: wrongQuestions = [], isLoading: loadingWrong } =
    useRetryQuestionsWithFeedbackForStudyQuery(trainingId)
  const generateMutation = useGenerateStudyItemContentMutation(trainingId, studyItemId)

  const item = items.find((i) => i.id === studyItemId)
  if (item == null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-slate-600">Item de estudo não encontrado.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Voltar ao estudo
        </button>
      </div>
    )
  }

  const exercises = item.exercises
  const linkedSet = new Set(item.linkedQuestionIds)
  const wrongForItem = wrongQuestions.filter((q) =>
    linkedSet.size > 0 ? linkedSet.has(q.id) : (q.subject ?? 'Sem matéria') === item.subject,
  ) as Array<QuestionWithFeedback>

  const safeEx = exercises.length > 0 ? Math.min(exIdx, exercises.length - 1) : 0
  const safeWrong = wrongForItem.length > 0 ? Math.min(wrongIdx, wrongForItem.length - 1) : 0
  const currentEx = exercises[safeEx]

  const tabs: Array<{ id: Tab; label: string; icon: typeof DocumentTextIcon; count?: number }> = [
    { id: 'rec', label: 'Recomendação', icon: DocumentTextIcon },
    { id: 'exp', label: 'Explicação', icon: BookOpenIcon },
    { id: 'exe', label: 'Exercícios', icon: PencilSquareIcon, count: exercises.length },
    { id: 'err', label: 'Questões que errei', icon: ClipboardDocumentListIcon, count: wrongForItem.length },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      {/* Identidade + concluir vivem no header da página (StudyFocusHeader). */}
      {/* Abas */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold leading-none ${
                    active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      <div className="min-h-[260px] p-5 sm:p-6">
        {tab === 'rec' && (
          <div className="flex flex-col gap-5">
            <div className="text-sm leading-relaxed text-slate-700">
              <Markdown>{item.recommendationText}</Markdown>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-sm text-slate-500">
                Aprofunde com a explicação detalhada.
              </p>
              <button
                type="button"
                onClick={() => setTab('exp')}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Ir para Explicação <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {tab === 'exp' && (
          <div className="flex flex-col gap-5">
            {item.explanation == null && !generateMutation.isPending && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
                  <SparklesIcon className="h-8 w-8 text-cyan-400" />
                </span>
                <p className="text-sm font-medium text-slate-700">
                  Nenhuma explicação gerada ainda
                </p>
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  <SparklesIcon className="h-4 w-4" /> Gerar com IA
                </button>
              </div>
            )}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center gap-3 py-8">
                <CircularProgress size={30} />
                <p className="text-sm text-slate-500">Gerando conteúdo com IA…</p>
              </div>
            )}
            {item.explanation != null && (
              <>
                <div className="text-sm leading-relaxed text-slate-700">
                  <Markdown>{item.explanation}</Markdown>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setTab('exe')}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                  >
                    Ir para Exercícios <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'exe' && (
          <div className="flex flex-col gap-5">
            {exercises.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
                  <PencilSquareIcon className="h-8 w-8 text-cyan-400" />
                </span>
                <p className="text-sm font-medium text-slate-700">Nenhum exercício ainda</p>
                <button
                  type="button"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-70"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {generateMutation.isPending ? 'Gerando…' : 'Gerar com IA'}
                </button>
              </div>
            ) : (
              <>
                <Navigator
                  noun="Exercício"
                  current={safeEx}
                  total={exercises.length}
                  onPrev={() => setExIdx((i) => Math.max(0, i - 1))}
                  onNext={() => setExIdx((i) => Math.min(exercises.length - 1, i + 1))}
                  className="justify-between"
                />
                <ExerciseBlock
                  exercise={currentEx}
                  selectedId={selectedByExercise[currentEx.id]}
                  onSelect={(id) =>
                    setSelectedByExercise((prev) => ({ ...prev, [currentEx.id]: id }))
                  }
                />
              </>
            )}
          </div>
        )}

        {tab === 'err' && (
          <div className="flex flex-col gap-4">
            {loadingWrong ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <CircularProgress size={26} />
                <p className="text-sm text-slate-500">Carregando questões…</p>
              </div>
            ) : wrongForItem.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <ClipboardDocumentListIcon className="h-7 w-7 text-slate-400" />
                </span>
                <p className="text-sm text-slate-500">Nenhuma questão errada nesta matéria.</p>
              </div>
            ) : (
              wrongForItem[safeWrong] && (
                /* Navegador embutido na linha de abas da questão: evita empilhar
                   uma linha extra entre as abas do ponto e as da questão. */
                <QuestionWithFeedbackDisplay
                  question={wrongForItem[safeWrong]}
                  compact
                  toolbar={
                    <Navigator
                      noun="Questão"
                      current={safeWrong}
                      total={wrongForItem.length}
                      onPrev={() => setWrongIdx((i) => Math.max(0, i - 1))}
                      onNext={() =>
                        setWrongIdx((i) => Math.min(wrongForItem.length - 1, i + 1))
                      }
                    />
                  }
                />
              )
            )}
          </div>
        )}
      </div>

    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Header do ponto em foco (substitui o header da página)             */
/* ------------------------------------------------------------------ */

/**
 * Quando um ponto de estudo está aberto, o HEADER da página vira o ponto:
 * matéria como eyebrow, título como h1 e o CTA de concluir à direita. O
 * painel (`StudyItemFocus`) fica só com abas + conteúdo, e a saída é o
 * breadcrumb "← Estudo".
 */
export function StudyFocusHeader(props: {
  trainingId: string
  studyItemId: string
  onBack: () => void
}) {
  const { trainingId, studyItemId, onBack } = props
  const { data: items = [] } = useTrainingStudyItemsQuery(trainingId)
  const completeMutation = useCompleteStudyItemMutation(trainingId, studyItemId)

  const item = items.find((i) => i.id === studyItemId)
  if (item == null) {
    return (
      <header aria-busy className="flex items-center gap-4">
        <BackSquare aria-label="Voltar à lista de estudo" onClick={onBack} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="h-3 w-32 animate-pulse rounded bg-slate-200" />
          <span className="h-7 w-72 max-w-full animate-pulse rounded bg-slate-200" />
        </div>
      </header>
    )
  }
  const isDone = Boolean(item.completedAt)

  return (
    <header className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
      <BackSquare aria-label="Voltar à lista de estudo" onClick={onBack} />
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">
          Estudo · {item.subject}
        </p>
        <h1
          style={{ viewTransitionName: 'study-item-title' }}
          className="text-balance text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
        >
          {item.recommendationTitle}
        </h1>
      </div>
      <button
        type="button"
        onClick={() => completeMutation.mutate(!isDone)}
        disabled={completeMutation.isPending}
        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
          isDone
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-cyan-600 text-white hover:bg-cyan-700'
        } disabled:cursor-wait disabled:opacity-70`}
      >
        {completeMutation.isPending ? (
          <CircularProgress size={15} color="inherit" />
        ) : isDone ? (
          <CheckCircleIcon className="h-4 w-4" />
        ) : (
          <CheckIcon className="h-4 w-4" />
        )}
        {isDone ? 'Concluído' : 'Marcar como concluído'}
      </button>
    </header>
  )
}
