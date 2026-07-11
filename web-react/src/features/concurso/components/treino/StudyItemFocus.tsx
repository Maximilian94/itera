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

type Tab = 'rec' | 'exp' | 'exe' | 'err'

/* ------------------------------------------------------------------ */
/*  Navegador 1/N (exercícios e questões erradas)                      */
/* ------------------------------------------------------------------ */

function Navigator(props: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const { current, total, onPrev, onNext } = props
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Anterior"
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-cyan-500' : i < current ? 'w-1.5 bg-cyan-300' : 'w-1.5 bg-slate-300'
            }`}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
        {current + 1}/{total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Próxima"
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
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
  studyProgress: { done: number; total: number }
  onBack: () => void
}) {
  const { trainingId, studyItemId, studyProgress, onBack } = props
  const [tab, setTab] = useState<Tab>('exe')
  const [exIdx, setExIdx] = useState(0)
  const [wrongIdx, setWrongIdx] = useState(0)
  const [selectedByExercise, setSelectedByExercise] = useState<Record<string, string>>({})

  const { data: items = [] } = useTrainingStudyItemsQuery(trainingId)
  const { data: wrongQuestions = [], isLoading: loadingWrong } =
    useRetryQuestionsWithFeedbackForStudyQuery(trainingId)
  const completeMutation = useCompleteStudyItemMutation(trainingId, studyItemId)
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

  const isDone = Boolean(item.completedAt)
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

  const studyPct =
    studyProgress.total > 0 ? Math.round((studyProgress.done / studyProgress.total) * 100) : 0

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      {/* Topo: voltar ao plano + identidade + concluir */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-cyan-600 to-cyan-700 px-4 py-3.5 text-white sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/25"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar ao estudo
        </button>
        <div className="min-w-0 text-right">
          <p className="text-[0.62rem] font-bold uppercase tracking-wide text-white/70">
            Estudo · {item.subject}
          </p>
          <p className="truncate text-base font-extrabold">{item.recommendationTitle}</p>
        </div>
        <button
          type="button"
          onClick={() => completeMutation.mutate(!isDone)}
          disabled={completeMutation.isPending}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors ${
            isDone
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white text-cyan-700 hover:bg-cyan-50'
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
      </div>

      {/* Progresso do estudo segue à vista */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
        <span className="shrink-0">
          Estudo: {studyProgress.done} de {studyProgress.total} recomendações
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${studyPct}%` }} />
        </div>
        <span className="shrink-0 tabular-nums">{studyPct}%</span>
      </div>

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
                    active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'
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
                  current={safeEx}
                  total={exercises.length}
                  onPrev={() => setExIdx((i) => Math.max(0, i - 1))}
                  onNext={() => setExIdx((i) => Math.min(exercises.length - 1, i + 1))}
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
              <>
                <Navigator
                  current={safeWrong}
                  total={wrongForItem.length}
                  onPrev={() => setWrongIdx((i) => Math.max(0, i - 1))}
                  onNext={() => setWrongIdx((i) => Math.min(wrongForItem.length - 1, i + 1))}
                />
                {wrongForItem[safeWrong] && (
                  <QuestionWithFeedbackDisplay question={wrongForItem[safeWrong]} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
