import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button, CircularProgress } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import {
  useTrainingStudyItemsQuery,
  useCompleteStudyItemMutation,
  useGenerateStudyItemContentMutation,
  useRetryQuestionsWithFeedbackForStudyQuery,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'
import type { TrainingStudyItemExercise } from '@/features/training/domain/training.types'
import { QuestionWithFeedbackDisplay } from '@/components/QuestionWithFeedbackDisplay'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/estudo/$studyItemId',
)({
  component: StudyItemDetailPage,
})

const TAB_RECOMENDACAO = 0
const TAB_EXPLICACAO = 1
const TAB_EXERCICIOS = 2
const TAB_QUESTOES_ERRADAS = 3

/* ------------------------------------------------------------------ */
/*  Tab button                                                         */
/* ------------------------------------------------------------------ */

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  badge,
}: {
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  isActive: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
        isActive
          ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {badge != null && badge > 0 && (
        <span
          className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full leading-none ${
            isActive
              ? 'bg-cyan-100 text-cyan-600'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Navigation between questions/exercises                             */
/* ------------------------------------------------------------------ */

function QuestionNavigator({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Anterior"
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 bg-cyan-500'
                : i < current
                  ? 'w-1.5 bg-cyan-300'
                  : 'w-1.5 bg-slate-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
        {current + 1}/{total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Próxima"
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise block                                                     */
/* ------------------------------------------------------------------ */

function StudyExerciseBlock({
  exercise,
  selectedAlternativeId,
  onSelectAlternative,
}: {
  exercise: TrainingStudyItemExercise
  selectedAlternativeId?: string
  onSelectAlternative: (alternativeId: string) => void
}) {
  const sortedAlternatives = [...exercise.alternatives].sort((a, b) =>
    (a.key || '').localeCompare(b.key || ''),
  )
  const hasSelection = selectedAlternativeId != null

  return (
    <div className="flex flex-col gap-5">
      <div className="text-base text-slate-900 leading-relaxed">
        <Markdown>{exercise.statement}</Markdown>
      </div>
      <div className="flex flex-col gap-2.5">
        {sortedAlternatives.map((alt) => {
          const isSelected = selectedAlternativeId === alt.id
          const isCorrect = alt.isCorrect
          const isWrong = hasSelection && isSelected && !isCorrect
          const showResult = hasSelection

          const optionBg = showResult
            ? isCorrect
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200'
              : isWrong
                ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-200'
                : 'bg-slate-50 border-slate-200'
            : isSelected
              ? 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-200'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'

          const keyBadge = showResult
            ? isCorrect
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
              onClick={() => onSelectAlternative(alt.id)}
              className={`flex gap-3 items-start w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${optionBg}`}
            >
              <span
                className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors ${keyBadge}`}
              >
                {alt.key}
              </span>
              <span className="text-sm text-slate-800 flex-1 pt-1">
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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function StudyItemDetailPage() {
  const { trainingId, studyItemId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(0)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [wrongQuestionIndex, setWrongQuestionIndex] = useState(0)
  const [selectedByExerciseId, setSelectedByExerciseId] = useState<
    Record<string, string>
  >({})

  const { data: studyItems = [], isLoading } =
    useTrainingStudyItemsQuery(trainingId)
  const {
    data: retryQuestionsWithFeedback = [],
    isLoading: isLoadingWrongQuestions,
  } = useRetryQuestionsWithFeedbackForStudyQuery(trainingId)
  const item = studyItems.find((i) => i.id === studyItemId)
  const linkedQuestionIdsSet = new Set(item?.linkedQuestionIds ?? [])
  const wrongQuestionsForSubject =
    item != null
      ? retryQuestionsWithFeedback.filter((q) => {
          if (linkedQuestionIdsSet.size > 0) {
            return linkedQuestionIdsSet.has(q.id)
          }
          return (q.subject ?? 'Sem matéria') === item.subject
        })
      : []
  const totalWrongQuestions = wrongQuestionsForSubject.length
  const safeWrongQuestionIndex =
    totalWrongQuestions > 0
      ? Math.min(wrongQuestionIndex, totalWrongQuestions - 1)
      : 0
  const completeMutation = useCompleteStudyItemMutation(
    trainingId,
    studyItemId,
  )
  const generateMutation = useGenerateStudyItemContentMutation(
    trainingId,
    studyItemId,
  )
  const isPronto = Boolean(item?.completedAt)
  const exercises = item?.exercises ?? []
  const totalExercises = exercises.length
  const safeExerciseIndex =
    totalExercises > 0 ? Math.min(exerciseIndex, totalExercises - 1) : 0
  const currentExercise =
    totalExercises > 0 ? exercises[safeExerciseIndex] : null

  const handleVoltarEstudo = () => {
    queryClient.invalidateQueries({
      queryKey: trainingKeys.studyItems(trainingId),
    })
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    navigate({ to: '/treino/$trainingId/estudo', params: { trainingId } })
  }

  const togglePronto = () => {
    completeMutation.mutate(!isPronto, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
        queryClient.invalidateQueries({
          queryKey: trainingKeys.studyItems(trainingId),
        })
        handleVoltarEstudo()
      },
    })
  }

  /* ---- loading ---- */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200/60" />
        <div className="h-12 rounded-xl bg-slate-200/60" />
        <div className="h-64 rounded-xl bg-slate-200/60" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-4 items-start">
        <p className="text-slate-600 text-sm">
          Item de estudo não encontrado.
        </p>
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={handleVoltarEstudo}
        >
          Voltar ao plano de estudo
        </Button>
      </div>
    )
  }

  const tabButtons = [
    {
      value: TAB_RECOMENDACAO,
      label: 'Recomendação',
      icon: DocumentTextIcon,
    },
    { value: TAB_EXPLICACAO, label: 'Explicação', icon: BookOpenIcon },
    {
      value: TAB_EXERCICIOS,
      label: 'Exercícios',
      icon: PencilSquareIcon,
      badge: totalExercises,
    },
    {
      value: TAB_QUESTOES_ERRADAS,
      label: 'Questões que errei',
      icon: ClipboardDocumentListIcon,
      badge: totalWrongQuestions,
    },
  ]

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ═══════════ HEADER ═══════════ */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-6 bg-linear-to-br from-cyan-600 via-cyan-500 to-violet-500"
        style={{ animation: 'scale-in 0.4s ease-out both' }}
      >
        {/* decorative */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1">
              {item.subject}
            </p>
            <h1 className="text-lg md:text-xl font-bold text-white truncate">
              {item.recommendationTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowLeftIcon className="w-4 h-4" />}
              onClick={handleVoltarEstudo}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                completeMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : isPronto ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )
              }
              onClick={togglePronto}
              disabled={completeMutation.isPending}
              sx={{
                backgroundColor: isPronto
                  ? 'rgba(255,255,255,0.2)'
                  : 'white',
                color: isPronto ? 'white' : '#4f46e5',
                '&:hover': {
                  backgroundColor: isPronto
                    ? 'rgba(255,255,255,0.3)'
                    : '#f0f0f0',
                },
              }}
            >
              {isPronto ? 'Concluído' : 'Marcar como concluído'}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS + CONTENT ═══════════ */}
      <Card noElevation className="overflow-hidden border border-slate-200">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabButtons.map((t) => (
            <TabButton
              key={t.value}
              label={t.label}
              icon={t.icon}
              isActive={tab === t.value}
              onClick={() => setTab(t.value)}
              badge={t.badge}
            />
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 min-h-[280px]">
          {/* ---- RECOMENDAÇÃO ---- */}
          {tab === TAB_RECOMENDACAO && (
            <div
              className="flex flex-col gap-5"
              style={{ animation: 'fade-in-up 0.3s ease-out both' }}
            >
              <div className="text-sm text-slate-700 leading-relaxed">
                <Markdown>{item.recommendationText}</Markdown>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-3">
                  Aprofunde o conhecimento neste assunto com a explicação
                  detalhada.
                </p>
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ArrowRightIcon className="w-4 h-4" />}
                  onClick={() => setTab(TAB_EXPLICACAO)}
                >
                  Ir para Explicação
                </Button>
              </div>
            </div>
          )}

          {/* ---- EXPLICAÇÃO ---- */}
          {tab === TAB_EXPLICACAO && (
            <div
              className="flex flex-col gap-5"
              style={{ animation: 'fade-in-up 0.3s ease-out both' }}
            >
              {!item.explanation && !generateMutation.isPending && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center">
                    <SparklesIcon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Nenhuma explicação gerada ainda
                    </p>
                    <p className="text-xs text-slate-500">
                      Gere uma explicação detalhada e exercícios com IA
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SparklesIcon className="w-4 h-4" />}
                    onClick={() => generateMutation.mutate()}
                  >
                    Gerar com IA
                  </Button>
                </div>
              )}
              {generateMutation.isPending && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <CircularProgress size={32} />
                  <p className="text-sm text-slate-500">
                    Gerando conteúdo com IA...
                  </p>
                </div>
              )}
              {item.explanation && (
                <>
                  <div className="text-sm text-slate-700 leading-relaxed">
                    <Markdown>{item.explanation}</Markdown>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-3">
                      Hora de praticar! Teste seu conhecimento com os exercícios.
                    </p>
                    <Button
                      variant="contained"
                      color="primary"
                      endIcon={<ArrowRightIcon className="w-4 h-4" />}
                      onClick={() => setTab(TAB_EXERCICIOS)}
                    >
                      Ir para Exercícios
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- QUESTÕES ERRADAS ---- */}
          {tab === TAB_QUESTOES_ERRADAS && (
            <div
              className="flex flex-col gap-4"
              style={{ animation: 'fade-in-up 0.3s ease-out both' }}
            >
              {isLoadingWrongQuestions ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CircularProgress size={28} />
                  <p className="text-sm text-slate-500">
                    Carregando questões...
                  </p>
                </div>
              ) : wrongQuestionsForSubject.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <ClipboardDocumentListIcon className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">
                    Nenhuma questão errada nesta matéria.
                  </p>
                </div>
              ) : (
                <>
                  <QuestionNavigator
                    current={safeWrongQuestionIndex}
                    total={totalWrongQuestions}
                    onPrev={() =>
                      setWrongQuestionIndex((i) => Math.max(0, i - 1))
                    }
                    onNext={() =>
                      setWrongQuestionIndex((i) =>
                        Math.min(totalWrongQuestions - 1, i + 1),
                      )
                    }
                  />
                  {wrongQuestionsForSubject[safeWrongQuestionIndex] && (
                    <QuestionWithFeedbackDisplay
                      question={
                        wrongQuestionsForSubject[safeWrongQuestionIndex]
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* ---- EXERCÍCIOS ---- */}
          {tab === TAB_EXERCICIOS && (
            <div
              className="flex flex-col gap-5"
              style={{ animation: 'fade-in-up 0.3s ease-out both' }}
            >
              {totalExercises === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center">
                    <PencilSquareIcon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Nenhum exercício ainda
                    </p>
                    <p className="text-xs text-slate-500">
                      Gere exercícios com IA para praticar este tema
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SparklesIcon className="w-4 h-4" />}
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending
                      ? 'Gerando...'
                      : 'Gerar com IA'}
                  </Button>
                </div>
              ) : (
                <>
                  <QuestionNavigator
                    current={safeExerciseIndex}
                    total={totalExercises}
                    onPrev={() =>
                      setExerciseIndex((i) => Math.max(0, i - 1))
                    }
                    onNext={() =>
                      setExerciseIndex((i) =>
                        Math.min(totalExercises - 1, i + 1),
                      )
                    }
                  />

                  {currentExercise && (
                    <StudyExerciseBlock
                      exercise={currentExercise}
                      selectedAlternativeId={
                        selectedByExerciseId[currentExercise.id]
                      }
                      onSelectAlternative={(alternativeId) =>
                        setSelectedByExerciseId((prev) => ({
                          ...prev,
                          [currentExercise.id]: alternativeId,
                        }))
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
