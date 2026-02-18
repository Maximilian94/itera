import { Alert, Button, Snackbar, Tooltip } from '@mui/material'
import { Link } from '@tanstack/react-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
import { Card } from '@/components/Card'
import { QuestionEditor } from '@/components/QuestionEditor'
import {
  BookmarkIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EyeIcon,
  FlagIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusCircleIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline'
import { ChevronLeftIcon, ChevronRightIcon, BookOpenIcon as BookOpenIconSolid } from '@heroicons/react/24/solid'
import {
  useExamBaseAttemptQuery,
  useUpsertExamBaseAttemptAnswerMutation,
  useFinishExamBaseAttemptMutation,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import {
  useTrainingQuery,
  useRetryQuestionsQuery,
  useRetryQuestionsWithFeedbackQuery,
  useRetryAnswersQuery,
  useUpsertRetryAnswerMutation,
  useUpdateTrainingStageMutation,
} from '@/features/training/queries/training.queries'
import {
  useExamBaseQuestionsQuery,
  getApiMessage,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { authService } from '@/features/auth/services/auth.service'
/** Question shape used by the player (attempt has full; retry before finish has no correctAlternative/explanation). */
type PlayerQuestion = {
  id: string
  statement: string
  statementImageUrl?: string | null
  referenceText?: string | null
  subject?: string | null
  topic?: string | null
  correctAlternative?: string | null
  alternatives: Array<{ id: string; key: string; text: string; explanation?: string | null }>
}

const QUESTION_ALTERNATIVE_KEYS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
]

function QuestionSlide({
  direction,
  children,
}: {
  direction: 'forward' | 'backward'
  children: React.ReactNode
}) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div
      className={`transition-transform duration-300 ease-out ${
        entered ? 'translate-x-0' : direction === 'forward' ? 'translate-x-full' : '-translate-x-full'
      }`}
    >
      {children}
    </div>
  )
}

export interface ExamAttemptPlayerProps {
  /** Normal exam mode: attempt from exam flow */
  examBaseId?: string
  attemptId?: string
  /** Retry mode: re-tentativa do treino (só questões erradas). Quando setado, examBaseId/attemptId são ignorados. */
  trainingId?: string
  /** Training prova phase: simplified UI (no tabs, no sidebar finalize, blue nav, nav below alternatives). */
  trainingProvaMode?: boolean
  /** For "Ver feedback" link (attempt mode when finished). If not provided, button is hidden when finished. */
  feedbackLink?: { examBoard: string; examId: string; attemptId: string }
  /** For error/empty state back button. If not provided, no back button. */
  onBack?: () => void
  /** Called after finishing (attempt or retry). */
  onFinished?: () => void
  /** Called if the finish mutation fails. */
  onFinishError?: () => void
  /** Retry mode when finished: called when user clicks "Ver resultado final". */
  onNavigateToFinal?: () => void
  /** When trainingProvaMode: ref to expose finish API for external button. */
  finishRef?: React.MutableRefObject<{ finish: () => void } | null>
  /** When trainingProvaMode: called when finish state changes (for external footer). */
  onTrainingProvaStateChange?: (state: {
    isFinished: boolean
    isFinishPending: boolean
    finish: () => void
    hasUnansweredQuestions: boolean
    firstUnansweredIndex: number
    goToQuestion: (index: number) => void
  }) => void
  /** Enable admin edit mode. Shows "Editar" tab for ADMIN users. */
  enableEditMode?: boolean
  /** Enable management mode. Shows questions from examBase without attempt. */
  managementMode?: boolean
  /** Callback when "Adicionar questão" is clicked in management mode. */
  onAddQuestion?: () => void
}

export function ExamAttemptPlayer({
  examBaseId,
  attemptId,
  trainingId,
  trainingProvaMode = false,
  feedbackLink,
  onBack,
  onFinished,
  onFinishError,
  onNavigateToFinal,
  finishRef,
  onTrainingProvaStateChange,
  enableEditMode = false,
  managementMode = false,
  onAddQuestion,
}: ExamAttemptPlayerProps) {
  const isRetryMode = Boolean(trainingId)
  const isManagementMode = Boolean(managementMode)
  const queryClient = useQueryClient()

  const attemptQuery = useExamBaseAttemptQuery(
    isRetryMode || isManagementMode ? undefined : examBaseId,
    isRetryMode || isManagementMode ? undefined : attemptId,
  )
  const upsertAttemptAnswer = useUpsertExamBaseAttemptAnswerMutation(
    examBaseId ?? '',
    attemptId ?? '',
  )
  const finishAttemptMutation = useFinishExamBaseAttemptMutation(
    examBaseId ?? '',
    attemptId ?? '',
  )

  const { data: training } = useTrainingQuery(trainingId)
  const retryFinished = Boolean(training?.retryFinishedAt)
  const retryQuestionsQuery = useRetryQuestionsQuery(trainingId)
  const retryQuestionsWithFeedbackQuery = useRetryQuestionsWithFeedbackQuery(
    trainingId,
    retryFinished,
  )
  const retryAnswersQuery = useRetryAnswersQuery(trainingId)
  const upsertRetryAnswer = useUpsertRetryAnswerMutation(trainingId ?? '')
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId ?? '')

  // Fetch questions for management mode
  const {
    data: managementQuestions = [],
    isLoading: isLoadingManagement,
    error: managementError,
  } = useExamBaseQuestionsQuery(
    isManagementMode && examBaseId ? examBaseId : undefined
  )

  // Admin check and full questions for edit mode
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
    enabled: enableEditMode,
  })
  const isAdmin = profileData?.user?.role === 'ADMIN'

  const [value, setValue] = useState(0)

  // Fetch full questions when edit tab is active and user is admin (not needed in management mode as we already have them)
  const {
    data: fullQuestions = [],
    isLoading: isLoadingFullQuestions,
    error: fullQuestionsError,
  } = useExamBaseQuestionsQuery(
    !isManagementMode && enableEditMode && isAdmin && value === 6 ? examBaseId : undefined
  )

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward')
  const [eliminatedByQuestion, setEliminatedByQuestion] = useState<
    Record<string, Set<string>>
  >({})
  const [scrollToAlternativeId, setScrollToAlternativeId] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const explanationRefsMap = useRef<Record<string, HTMLDivElement | null>>({})

  const questions: PlayerQuestion[] = isManagementMode
    ? managementQuestions
    : isRetryMode
      ? (retryFinished
          ? (retryQuestionsWithFeedbackQuery.data ?? [])
          : (retryQuestionsQuery.data ?? []))
      : (attemptQuery.data?.questions ?? [])
  const answers: Record<string, string | null> = isManagementMode
    ? {}
    : isRetryMode
      ? (retryAnswersQuery.data ?? {})
      : (attemptQuery.data?.answers ?? {})
  const isFinished = isManagementMode
    ? false
    : isRetryMode
      ? retryFinished
      : Boolean(attemptQuery.data?.attempt.finishedAt)
  const isLoading = isManagementMode
    ? isLoadingManagement
    : isRetryMode
      ? retryQuestionsQuery.isLoading || (retryFinished && retryQuestionsWithFeedbackQuery.isLoading)
      : attemptQuery.isLoading
  const error = isManagementMode
    ? managementError
    : isRetryMode
      ? retryQuestionsQuery.error
      : attemptQuery.error

  const currentQuestion = questions[currentQuestionIndex]
  const questionCount = questions.length
  // In management mode, use managementQuestions (already full); in edit mode, use fullQuestions
  const fullQuestion = isManagementMode
    ? managementQuestions.find(q => q.id === currentQuestion?.id)
    : fullQuestions.find(q => q.id === currentQuestion?.id)

  const unansweredIndices = React.useMemo(() => {
    return questions
      .map((q, i) => (answers[q.id] == null || answers[q.id] === '' ? i : -1))
      .filter((i) => i >= 0)
  }, [questions, answers])
  const hasUnansweredQuestions = unansweredIndices.length > 0
  const firstUnansweredIndex = unansweredIndices[0] ?? 0

  const goToQuestion = useCallback((index: number) => {
    setSlideDirection(index > currentQuestionIndex ? 'forward' : 'backward')
    setCurrentQuestionIndex(index)
  }, [currentQuestionIndex])

  const handleOptionSelected = (
    questionId: string,
    alternativeId: string,
    isEliminated: boolean,
  ) => {
    if (isEliminated || isManagementMode) return
    const current = answers[questionId]
    const nextId = current === alternativeId ? null : alternativeId
    const onError = (err: unknown, variables: { questionId: string }) => {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
      const idx = questions.findIndex((q) => q.id === variables.questionId)
      if (idx >= 0) goToQuestion(idx)
    }
    if (isRetryMode) {
      if (nextId) {
        upsertRetryAnswer.mutate(
          { questionId, selectedAlternativeId: nextId },
          { onError },
        )
      }
    } else {
      upsertAttemptAnswer.mutate(
        { questionId, selectedAlternativeId: nextId },
        { onError },
      )
    }
  }

  const handleFinish = useCallback(() => {
    if (isRetryMode) {
      updateStageMutation.mutate('FINAL', {
        onSuccess: onFinished,
        onError: () => onFinishError?.(),
      })
    } else {
      finishAttemptMutation.mutate(undefined, {
        onSuccess: onFinished,
        onError: () => onFinishError?.(),
      })
    }
  }, [isRetryMode, updateStageMutation, finishAttemptMutation, onFinished, onFinishError])

  const handleQuestionDeleted = useCallback(() => {
    // Invalidate attempt queries to refresh question list
    if (examBaseId && attemptId) {
      queryClient.invalidateQueries({
        queryKey: ['examBaseAttempt', examBaseId, attemptId]
      })
    }

    // Navigate to next or previous question
    if (currentQuestionIndex < questionCount - 1) {
      setSlideDirection('forward')
      setCurrentQuestionIndex((i) => Math.min(questionCount - 1, i + 1))
    } else if (currentQuestionIndex > 0) {
      setSlideDirection('backward')
      setCurrentQuestionIndex((i) => Math.max(0, i - 1))
    } else {
      // Last question deleted - go back
      onBack?.()
    }

    // Switch back to question tab
    setValue(0)
  }, [examBaseId, attemptId, currentQuestionIndex, questionCount, queryClient, onBack])

  const isFinishPending = isRetryMode
    ? updateStageMutation.isPending
    : finishAttemptMutation.isPending
  const finishButtonLabel = isRetryMode ? 'Finalizar re-tentativa' : 'Finalizar prova'

  useEffect(() => {
    if (finishRef) {
      finishRef.current = { finish: handleFinish }
      return () => {
        finishRef.current = null
      }
    }
  }, [finishRef, handleFinish])

  const prevProvaStateKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!trainingProvaMode || !onTrainingProvaStateChange) return

    const stateKey = `${isFinished}-${isFinishPending}-${hasUnansweredQuestions}-${firstUnansweredIndex}`
    if (prevProvaStateKeyRef.current === stateKey) return
    prevProvaStateKeyRef.current = stateKey

    onTrainingProvaStateChange({
      isFinished,
      isFinishPending,
      finish: handleFinish,
      hasUnansweredQuestions,
      firstUnansweredIndex,
      goToQuestion,
    })
  }, [
    trainingProvaMode,
    onTrainingProvaStateChange,
    isFinished,
    isFinishPending,
    handleFinish,
    hasUnansweredQuestions,
    firstUnansweredIndex,
    goToQuestion,
  ])

  useEffect(() => {
    if (value === 1 && scrollToAlternativeId) {
      const el = explanationRefsMap.current[scrollToAlternativeId]
      const timer = setTimeout(() => {
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setScrollToAlternativeId(null)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [value, scrollToAlternativeId])

  useEffect(() => {
    setValue(0)
  }, [currentQuestionIndex])

  function getQuestionButtonStyle(index: number) {
    const isCurrent = currentQuestionIndex === index
    const q = questions[index]
    if (!q) return 'flex shrink-0 items-center justify-center w-full h-7 rounded border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium hover:bg-slate-200 cursor-pointer'
    const selectedId = answers[q.id] ?? null
    const isAnswered = selectedId != null && selectedId !== ''
    const correctAlt = q.correctAlternative
      ? q.alternatives.find((a) => a.key === q.correctAlternative)
      : null
    const correctId = correctAlt?.id ?? null
    const isCorrect =
      isFinished && isAnswered && correctId != null && selectedId === correctId
    const isWrong =
      isFinished && isAnswered && (correctId == null || selectedId !== correctId)

    const base = 'flex shrink-0 items-center justify-center w-full h-7 rounded text-xs font-medium cursor-pointer transition-colors'
    if (isCurrent) {
      return `${base} outline outline-2 outline-blue-400 outline-offset-0.5 ${
        isAnswered ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-200 text-slate-700 border border-slate-300'
      }`
    }
    if (isCorrect) return `${base} bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200`
    if (isWrong) return `${base} bg-red-100 text-red-700 border border-red-200 hover:bg-red-200`
    if (isAnswered) return `${base} bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200`
    return `${base} border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100`
  }

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 1 && !isFinished) return
    setValue(newValue)
  }

  const handlePrevQuestion = () => {
    setSlideDirection('backward')
    setCurrentQuestionIndex((i) => Math.max(0, i - 1))
  }

  const handleNextQuestion = () => {
    setSlideDirection('forward')
    setCurrentQuestionIndex((i) => Math.min(questionCount - 1, i + 1))
  }

  const handleSelectQuestion = (index: number) => {
    setSlideDirection(index > currentQuestionIndex ? 'forward' : 'backward')
    setCurrentQuestionIndex(index)
  }

  const toggleEliminated = (
    questionId: string,
    alternativeId: string,
    isEliminated: boolean,
  ) => {
    setEliminatedByQuestion((prev) => {
      const next = { ...prev }
      const set = new Set(next[questionId] ?? [])
      if (isEliminated) set.add(alternativeId)
      else set.delete(alternativeId)
      next[questionId] = set
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Card noElevation className="p-4">
          <span className="text-sm text-slate-500">Carregando prova…</span>
        </Card>
      </div>
    )
  }

  if (error || (!isRetryMode && !isManagementMode && !attemptQuery.data)) {
    return (
      <div className="flex flex-col gap-4">
        <Card noElevation className="flex flex-col gap-3 p-4">
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Tentativa não encontrada.'}
          </Alert>
          {onBack && (
            <Button variant="outlined" onClick={onBack}>
              Voltar
            </Button>
          )}
        </Card>
      </div>
    )
  }

  if (questionCount === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Card noElevation className="flex flex-col gap-3 p-4">
          <span className="text-sm text-slate-600">Esta prova não tem questões.</span>
          {onBack && (
            <Button variant="outlined" onClick={onBack}>
              Voltar
            </Button>
          )}
        </Card>
      </div>
    )
  }

  const selectedAlternativeId = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null
  const eliminatedSet = currentQuestion
    ? eliminatedByQuestion[currentQuestion.id] ?? new Set()
    : new Set<string>()

  const correctAlt = currentQuestion?.correctAlternative
    ? currentQuestion.alternatives.find((a) => a.key === currentQuestion.correctAlternative)
    : null
  const currentQuestionHasWrongAnswer =
    isFinished &&
    currentQuestion != null &&
    selectedAlternativeId != null &&
    correctAlt != null &&
    selectedAlternativeId !== correctAlt.id

  const comingSoonTooltip = 'Em breve disponível. Estamos trabalhando nisso.'
  const tabButtons = [
    { value: 0, label: 'Questão', icon: PlayIcon },
    { value: 1, label: 'Explicação', icon: BookOpenIcon, disabled: !isFinished },
    { value: 2, label: 'Estatísticas', icon: ChartBarIcon, comingSoon: true },
    { value: 3, label: 'Comentários', icon: ChatBubbleLeftRightIcon, comingSoon: true },
    { value: 4, label: 'Histórico', icon: ClockIcon, comingSoon: true },
    { value: 5, label: 'Notas', icon: PencilSquareIcon, comingSoon: true },
    ...((enableEditMode && isAdmin) || isManagementMode ? [
      { value: 6, label: 'Editar', icon: PencilSquareIcon }
    ] : []),
  ]

  return (
    <>
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-3 flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outlined"
              color={trainingProvaMode ? 'primary' : 'inherit'}
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              aria-label="Questão anterior"
              sx={{ flexShrink: 0, minWidth: 44 }}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium text-slate-700 shrink-0">
              Q {currentQuestionIndex + 1} / {questionCount}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip title={comingSoonTooltip} enterDelay={300}>
                <span className="inline-flex">
                  <button
                    type="button"
                    disabled
                    aria-label="Salvar questão"
                    className="p-2 rounded-lg text-slate-400 cursor-not-allowed opacity-60"
                  >
                    <BookmarkIcon className="w-5 h-5" />
                  </button>
                </span>
              </Tooltip>
              <Tooltip title={comingSoonTooltip} enterDelay={300}>
                <span className="inline-flex">
                  <button
                    type="button"
                    disabled
                    aria-label="Reportar questão"
                    className="p-2 rounded-lg text-slate-400 cursor-not-allowed opacity-60"
                  >
                    <FlagIcon className="w-5 h-5" />
                  </button>
                </span>
              </Tooltip>
              <Tooltip title={comingSoonTooltip} enterDelay={300}>
                <span className="inline-flex">
                  <button
                    type="button"
                    disabled
                    aria-label="Acompanhar questão"
                    className="p-2 rounded-lg text-slate-400 cursor-not-allowed opacity-60"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </span>
              </Tooltip>
            </div>
            <Button
              variant="outlined"
              color={trainingProvaMode ? 'primary' : 'inherit'}
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questionCount - 1}
              aria-label="Próxima questão"
              sx={{ flexShrink: 0, ml: 'auto', minWidth: 44 }}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </Button>
          </div>

          <Card noElevation className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0 flex flex-col">
              {(!trainingProvaMode || isFinished) && (
              <div className="sticky top-0 z-10 flex shrink-0 border-b border-slate-200 overflow-x-auto">
                {tabButtons.map((tab) => {
                const Icon = tab.icon
                const isActive = value === tab.value
                const isComingSoon = tab.comingSoon ?? false
                const isDisabled = (tab.disabled ?? false) || isComingSoon
                const isExplanationTab = tab.value === 1
                const showWrongAnswerHighlight = isExplanationTab && currentQuestionHasWrongAnswer
                const tabClasses = [
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')
                const isViewingExplanation = value === 1
                const TabIcon = isExplanationTab && showWrongAnswerHighlight && !isViewingExplanation
                  ? BookOpenIconSolid
                  : Icon
                const iconClassName = isExplanationTab && showWrongAnswerHighlight && !isViewingExplanation
                  ? 'w-4 h-4 text-amber-500 animate-[size-pulse_1.2s_ease-in-out_infinite]'
                  : 'w-4 h-4'
                const tooltipTitle = isComingSoon
                  ? comingSoonTooltip
                  : isDisabled
                    ? 'Disponível após finalizar a prova.'
                    : showWrongAnswerHighlight
                      ? 'Ver explicação para entender o erro'
                      : ''
                return (
                  <Tooltip key={tab.value} title={tooltipTitle}>
                    <span className="flex">
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleChange(null as any, tab.value)}
                        disabled={isDisabled}
                        className={tabClasses}
                      >
                        <TabIcon className={iconClassName} />
                        {tab.label}
                      </button>
                    </span>
                  </Tooltip>
                )
              })}
              </div>
              )}

              <div className="flex-1 overflow-x-hidden p-5 min-h-0">
              <CustomTabPanel value={value} hidden={value !== 0}>
                <QuestionSlide key={currentQuestionIndex} direction={slideDirection}>
                  {currentQuestion && (
                    <div className="flex flex-col gap-6">
                      {currentQuestion.referenceText && (
                        <div>
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Texto de referência</span>
                          <div className="mt-1 text-sm text-slate-700">
                            <Markdown>{currentQuestion.referenceText}</Markdown>
                          </div>
                        </div>
                      )}
                      {currentQuestion.statementImageUrl && (
                        <div className="max-w-[560px] rounded-lg border border-slate-300 overflow-hidden">
                          <img src={currentQuestion.statementImageUrl} alt="Enunciado" className="w-full h-auto block" />
                        </div>
                      )}
                      <div className="text-base font-medium text-slate-900">
                        <Markdown>{currentQuestion.statement}</Markdown>
                      </div>
                      <div className="flex flex-col gap-2">
                        {currentQuestion.alternatives.map((alt) => {
                          const isEliminated = eliminatedSet.has(alt.id)
                          const isSelected = selectedAlternativeId === alt.id
                          const isCorrect = currentQuestion.correctAlternative === alt.key
                          const isWrong = isFinished && isSelected && !isCorrect
                          const keyLabel = QUESTION_ALTERNATIVE_KEYS[currentQuestion.alternatives.findIndex((a) => a.id === alt.id)] ?? alt.key
                          const optionBg = isFinished
                            ? isCorrect ? 'bg-emerald-50 border-emerald-400' : isWrong ? 'bg-red-50 border-red-400' : 'bg-slate-50 border-slate-300'
                            : isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-300 hover:bg-slate-50'
                          const keyBadge = isFinished
                            ? isCorrect ? 'bg-emerald-600 text-white' : isWrong ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                            : isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                          return (
                            <div key={alt.id} className="group relative flex items-center gap-2">
                              {!isFinished && (
                                <Tooltip title={isEliminated ? 'Desfazer eliminação' : 'Eliminar alternativa'}>
                                  <button
                                    type="button"
                                    onClick={() => toggleEliminated(currentQuestion.id, alt.id, !isEliminated)}
                                    aria-label={isEliminated ? 'Desfazer eliminação' : 'Eliminar alternativa'}
                                    className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0 transition-opacity ${isEliminated ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  >
                                    <ScissorsIcon className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {isFinished && (
                                <Tooltip title="Ver explicação">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setScrollToAlternativeId(alt.id)
                                      setValue(1)
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 bg-white/90 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-slate-50 hover:border-slate-300 transition-all z-10"
                                  >
                                    <BookOpenIcon className="w-3.5 h-3.5" />
                                    Ver explicação
                                  </button>
                                </Tooltip>
                              )}
                              <button
                                type="button"
                                className={`flex gap-3 items-center justify-start w-full p-2 shadow-sm hover:shadow-xs active:shadow-none rounded-lg text-left border transition-colors outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400 ${isEliminated || isManagementMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${optionBg} ${isFinished || isManagementMode ? 'cursor-default' : ''}`}
                                onClick={() => handleOptionSelected(currentQuestion.id, alt.id, isEliminated)}
                                disabled={isEliminated || isFinished || isManagementMode}
                              >
                                <span className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}>{keyLabel}</span>
                                <span className="text-sm text-slate-800 flex-1"><Markdown>{alt.text}</Markdown></span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {trainingProvaMode && (
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-2">
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIndex === 0}
                            startIcon={<ChevronLeftIcon className="w-5 h-5" />}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleNextQuestion}
                            disabled={currentQuestionIndex === questionCount - 1}
                            endIcon={<ChevronRightIcon className="w-5 h-5" />}
                          >
                            Próxima
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </QuestionSlide>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 1}>
                <div className="flex flex-col gap-6">
                  {!isFinished && <span className="text-sm text-slate-500">As explicações ficam disponíveis após você finalizar a prova.</span>}
                  {isFinished && currentQuestion && (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Resposta correta: {currentQuestion.correctAlternative ?? '—'}</p>
                      <div className="flex flex-col gap-5">
                        {currentQuestion.alternatives.map((alt, idx) => {
                          const keyLabel = QUESTION_ALTERNATIVE_KEYS[idx] ?? alt.key
                          const isCorrect = currentQuestion.correctAlternative === alt.key
                          const wasSelected = selectedAlternativeId === alt.id
                          const isWrong = wasSelected && !isCorrect
                          const variant = isCorrect ? 'correct' : isWrong ? 'wrong' : 'neutral'
                          const cardStyles = {
                            correct: 'border-2 border-emerald-400 bg-emerald-100 overflow-hidden rounded-lg',
                            wrong: 'border-2 border-red-400 bg-red-100 overflow-hidden rounded-lg',
                            neutral: 'border border-slate-300 bg-slate-50 overflow-hidden rounded-lg',
                          }
                          const headerTextStyles = { correct: 'text-emerald-800', wrong: 'text-red-800', neutral: 'text-slate-700' }
                          const badgeCorrect = 'text-xs font-semibold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded'
                          const badgeWrong = 'text-xs font-semibold text-red-700 bg-red-200/80 px-2 py-0.5 rounded'
                          const explanationWrapStyles = {
                            correct: 'border-t border-emerald-300 bg-emerald-50/70',
                            wrong: 'border-t border-red-300 bg-red-50/70',
                            neutral: 'border-t border-slate-200 bg-slate-100/70',
                          }
                          return (
                            <div key={alt.id} ref={(el) => { explanationRefsMap.current[alt.id] = el }} className={cardStyles[variant]}>
                              <div className="p-4">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className={`text-sm font-semibold ${headerTextStyles[variant]}`}>{keyLabel}.</span>
                                  {isCorrect && <span className={badgeCorrect}>Resposta correta</span>}
                                  {isWrong && <span className={badgeWrong}>Sua resposta</span>}
                                </div>
                                <div className={`text-sm ${headerTextStyles[variant]}`}><Markdown>{alt.text}</Markdown></div>
                              </div>
                              <div className={`p-4 ${explanationWrapStyles[variant]}`}>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Explicação</span>
                                {alt.explanation ? <div className="text-sm text-slate-700"><Markdown>{alt.explanation}</Markdown></div> : <span className="text-sm text-slate-500 italic">Sem explicação cadastrada.</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 2}>
                <div className="py-2"><span className="text-sm text-slate-500">Estatísticas (em breve)</span></div>
              </CustomTabPanel>
              <CustomTabPanel value={value} hidden={value !== 3}>
                <div className="py-2"><span className="text-sm text-slate-500">Comentários (em breve)</span></div>
              </CustomTabPanel>
              <CustomTabPanel value={value} hidden={value !== 4}>
                <div className="py-2"><span className="text-sm text-slate-500">Histórico (em breve)</span></div>
              </CustomTabPanel>
              <CustomTabPanel value={value} hidden={value !== 5}>
                <div className="py-2"><span className="text-sm text-slate-500">Notas (em breve)</span></div>
              </CustomTabPanel>
              <CustomTabPanel value={value} hidden={value !== 6}>
                {(isManagementMode ? isLoadingManagement : isLoadingFullQuestions) ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-slate-400">
                      Carregando dados da questão…
                    </div>
                  </div>
                ) : (isManagementMode ? managementError : fullQuestionsError) ? (
                  <Alert severity="error">
                    Erro ao carregar dados da questão. Tente novamente.
                  </Alert>
                ) : fullQuestion ? (
                  <QuestionEditor
                    examBaseId={examBaseId!}
                    question={fullQuestion}
                    onDeleted={handleQuestionDeleted}
                  />
                ) : (
                  <Alert severity="warning">
                    Questão não encontrada.
                  </Alert>
                )}
              </CustomTabPanel>
            </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3 w-56 shrink-0 min-h-0 overflow-hidden">
          {!trainingProvaMode && (
          <div className="shrink-0">
            {isManagementMode ? (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={onAddQuestion}
                startIcon={<PlusCircleIcon className="w-4 h-4" />}
              >
                Adicionar questão
              </Button>
            ) : isFinished ? (
              isRetryMode && onNavigateToFinal ? (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={onNavigateToFinal}
                >
                  Ver resultado final
                </Button>
              ) : feedbackLink ? (
                <Link
                  to="/exams/$examBoard/$examId/$attemptId/feedback"
                  params={feedbackLink}
                >
                  <Button variant="contained" color="primary" fullWidth>
                    Ver feedback
                  </Button>
                </Link>
              ) : null
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleFinish}
                disabled={isFinishPending}
              >
                {isFinishPending ? 'Finalizando…' : finishButtonLabel}
              </Button>
            )}
          </div>
          )}
          <Card noElevation className="p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
            <span className="text-xs font-medium text-slate-500 block mb-2 shrink-0">Questões</span>
            <div className="overflow-auto min-h-0 p-1.5">
              <div className="grid grid-cols-5 gap-1 content-start">
                {questions.map((_, index) => (
                  <button
                    key={questions[index].id}
                    type="button"
                    onClick={() => handleSelectQuestion(index)}
                    className={getQuestionButtonStyle(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={6000}
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="error"
        onClose={() => setSnackbarOpen(false)}
        variant="filled"
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
    </>
  )
}
