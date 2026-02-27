import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  TextField,
  Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Link } from '@tanstack/react-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { Card } from '@/components/Card'
import {
  BookmarkIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  EyeIcon,
  FlagIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlayIcon,
  PlusCircleIcon,
  ScissorsIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ChevronLeftIcon, ChevronRightIcon, BookOpenIcon as BookOpenIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid'
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
import { useExamBaseQuery } from '@/features/examBase/queries/examBase.queries'
import {
  useExamBaseQuestionsQuery,
  useUpdateExamBaseQuestionMutation,
  useDeleteExamBaseQuestionMutation,
  useCreateAlternativeMutation,
  useUpdateAlternativeMutation,
  useDeleteAlternativeMutation,
  useGenerateExplanationsMutation,
  getApiMessage,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'
import { formatExamBaseTitle } from '@/lib/utils'
/** Question shape used by the player (attempt has full; retry before finish has no correctAlternative/explanation). */
type PlayerQuestion = {
  id: string
  statement: string
  statementImageUrl?: string | null
  referenceText?: string | null
  subject?: string | null
  topic?: string | null
  subtopics?: string[]
  skills?: string[]
  correctAlternative?: string | null
  alternatives: Array<{ id: string; key: string; text: string; explanation?: string | null }>
}

function stringListToArray(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

function arrayToStringList(arr: string[]): string {
  return (arr ?? []).join(', ')
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
  /** @deprecated Editing is only available via management mode (managementMode). Kept for backward compatibility. */
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
  enableEditMode: _enableEditMode = false,
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
  const effectiveExamBaseId = examBaseId ?? training?.examBaseId
  const { data: examBase } = useExamBaseQuery(effectiveExamBaseId)
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

  const [value, setValue] = useState(0)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward')
  const [eliminatedByQuestion, setEliminatedByQuestion] = useState<
    Record<string, Set<string>>
  >({})
  const [scrollToAlternativeId, setScrollToAlternativeId] = useState<string | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const explanationRefsMap = useRef<Record<string, HTMLDivElement | null>>({})

  // Inline editing state
  const [editingStatement, setEditingStatement] = useState(false)
  const [editStatementValue, setEditStatementValue] = useState('')
  const [editingReferenceText, setEditingReferenceText] = useState(false)
  const [editReferenceTextValue, setEditReferenceTextValue] = useState('')
  const [editAlternativeById, setEditAlternativeById] = useState<Record<string, { text: string; explanation: string }>>({})
  const [showAddAlternative, setShowAddAlternative] = useState(false)
  const [newAltKey, setNewAltKey] = useState('')
  const [newAltText, setNewAltText] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadImageError, setUploadImageError] = useState<string | null>(null)
  const [statementImageLoadError, setStatementImageLoadError] = useState(false)
  const [editStatementImageUrl, setEditStatementImageUrl] = useState('')
  const statementImageFileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [subtopicsStr, setSubtopicsStr] = useState('')
  const [skillsStr, setSkillsStr] = useState('')
  const [generateExplainError, setGenerateExplainError] = useState<string | null>(null)
  const [disagreementWarning, setDisagreementWarning] = useState<string | null>(null)
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] = useState(false)

  // Inline editing mutations (question level only - alternatives are defined later)
  const updateQuestionMutation = useUpdateExamBaseQuestionMutation(examBaseId ?? '')

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

  // Alternative mutations (now that we have currentQuestion)
  const createAlternativeMutation = useCreateAlternativeMutation(examBaseId ?? '', currentQuestion?.id ?? '')
  const updateAlternativeMutation = useUpdateAlternativeMutation(examBaseId ?? '', currentQuestion?.id ?? '')
  const deleteAlternativeMutation = useDeleteAlternativeMutation(examBaseId ?? '', currentQuestion?.id ?? '')
  const deleteQuestionMutation = useDeleteExamBaseQuestionMutation(examBaseId ?? '')
  const generateExplanationsMutation = useGenerateExplanationsMutation(examBaseId ?? '', currentQuestion?.id ?? '')

  // Check if inline editing is enabled (only in management mode; admin edits via management page only)
  const canInlineEdit = isManagementMode

  // Handlers for inline editing
  const handleSaveStatement = useCallback(async () => {
    if (!currentQuestion || !editStatementValue.trim()) return
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { statement: editStatementValue.trim() },
      })
      setEditingStatement(false)
      setSnackbarMessage('Enunciado atualizado com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, editStatementValue, updateQuestionMutation])

  const handleSaveReferenceText = useCallback(async () => {
    if (!currentQuestion) return
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { referenceText: editReferenceTextValue.trim() || null },
      })
      setEditingReferenceText(false)
      setSnackbarMessage('Texto de referência atualizado com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, editReferenceTextValue, updateQuestionMutation])

  const handleSaveAlternative = useCallback(async (altId: string) => {
    const edit = editAlternativeById[altId]
    if (!edit?.text.trim()) return
    try {
      await updateAlternativeMutation.mutateAsync({
        alternativeId: altId,
        input: {
          text: edit.text.trim(),
          explanation: edit.explanation.trim(),
        },
      })
      setEditAlternativeById((prev) => {
        const next = { ...prev }
        delete next[altId]
        return next
      })
      setSnackbarMessage('Alternativa atualizada com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [editAlternativeById, updateAlternativeMutation])

  const handleAddAlternative = useCallback(async () => {
    if (!newAltKey.trim() || !newAltText.trim()) {
      setSnackbarMessage('Letra e texto são obrigatórios')
      setSnackbarOpen(true)
      return
    }
    try {
      await createAlternativeMutation.mutateAsync({
        key: newAltKey.trim().toUpperCase(),
        text: newAltText.trim(),
        explanation: '',
      })
      setNewAltKey('')
      setNewAltText('')
      setShowAddAlternative(false)
      setSnackbarMessage('Alternativa criada com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [newAltKey, newAltText, createAlternativeMutation])

  const handleDeleteAlternative = useCallback(async (altId: string) => {
    if (!window.confirm('Deseja realmente deletar esta alternativa?')) return
    try {
      await deleteAlternativeMutation.mutateAsync(altId)
      setSnackbarMessage('Alternativa deletada com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [deleteAlternativeMutation])

  const handleSetCorrectAlternative = useCallback(async (altKey: string) => {
    if (!currentQuestion) return
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { correctAlternative: altKey },
      })
      setSnackbarMessage('Resposta correta atualizada!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, updateQuestionMutation])

  const handleStatementImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentQuestion || !examBaseId) return
    e.target.value = ''
    setUploadImageError(null)
    setUploadingImage(true)
    try {
      const { url } = await examBaseQuestionsService.uploadStatementImage(examBaseId, file)
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { statementImageUrl: url },
      })
      setStatementImageLoadError(false)
      setSnackbarMessage('Imagem enviada com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setUploadImageError(getApiMessage(err))
    } finally {
      setUploadingImage(false)
    }
  }, [currentQuestion, examBaseId, updateQuestionMutation])

  const handleRemoveStatementImage = useCallback(async () => {
    if (!currentQuestion) return
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { statementImageUrl: null },
      })
      setStatementImageLoadError(false)
      setEditStatementImageUrl('')
      setSnackbarMessage('Imagem removida com sucesso!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, updateQuestionMutation])

  const handleApplyStatementImageUrl = useCallback(async () => {
    if (!currentQuestion) return
    const url = editStatementImageUrl.trim()
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: { statementImageUrl: url || null },
      })
      setStatementImageLoadError(false)
      setSnackbarMessage(url ? 'URL da imagem aplicada!' : 'Imagem removida.')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, editStatementImageUrl, updateQuestionMutation])

  const handleSaveMetadata = useCallback(async () => {
    if (!currentQuestion) return
    try {
      await updateQuestionMutation.mutateAsync({
        questionId: currentQuestion.id,
        input: {
          subject: subject.trim(),
          topic: topic.trim(),
          subtopics: stringListToArray(subtopicsStr),
          skills: stringListToArray(skillsStr),
        },
      })
      setSnackbarMessage('Matéria, tópico e habilidades atualizados!')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, subject, topic, subtopicsStr, skillsStr, updateQuestionMutation])

  const handleGenerateExplanations = useCallback(async () => {
    if (!currentQuestion || !examBaseId) return
    setGenerateExplainError(null)
    setDisagreementWarning(null)
    try {
      const result = await generateExplanationsMutation.mutateAsync()
      setTopic(result.topic)
      setSubtopicsStr(arrayToStringList(result.subtopics))
      const alternatives = [...currentQuestion.alternatives].sort((a, b) => a.key.localeCompare(b.key))
      const newEditById: Record<string, { text: string; explanation: string }> = {}
      for (const e of result.explanations) {
        const alt = alternatives.find((a) => a.key === e.key)
        if (alt) {
          await updateAlternativeMutation.mutateAsync({
            alternativeId: alt.id,
            input: { explanation: e.explanation },
          })
          newEditById[alt.id] = { text: alt.text, explanation: e.explanation }
        }
      }
      setEditAlternativeById(newEditById)
      setSnackbarMessage('Explicações salvas. Metadados (tópico, subtópicos) preenchidos em rascunho — revise e salve.')
      setSnackbarOpen(true)
      if (result.agreesWithCorrectAnswer === false) {
        setDisagreementWarning(
          result.disagreementWarning ??
            'A IA identificou possível inconsistência na resposta marcada como correta.',
        )
      }
    } catch (err) {
      setGenerateExplainError(getApiMessage(err))
    }
  }, [currentQuestion, examBaseId, generateExplanationsMutation, updateAlternativeMutation])

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

  const handleDeleteQuestionConfirm = useCallback(async () => {
    if (!currentQuestion) return
    try {
      await deleteQuestionMutation.mutateAsync(currentQuestion.id)
      setDeleteQuestionDialogOpen(false)
      handleQuestionDeleted()
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, deleteQuestionMutation, handleQuestionDeleted])

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

  // Reset inline editing state when switching questions
  useEffect(() => {
    setEditingStatement(false)
    setEditingReferenceText(false)
    setEditAlternativeById({})
    setGenerateExplainError(null)
    setDisagreementWarning(null)
    setEditStatementImageUrl(currentQuestion?.statementImageUrl ?? '')
    setStatementImageLoadError(false)
    setUploadImageError(null)
    setSubject(currentQuestion?.subject ?? '')
    setTopic(currentQuestion?.topic ?? '')
    setSubtopicsStr(arrayToStringList(currentQuestion?.subtopics ?? []))
    setSkillsStr(arrayToStringList(currentQuestion?.skills ?? []))
  }, [currentQuestion?.id, currentQuestion?.statementImageUrl, currentQuestion?.subject, currentQuestion?.topic, currentQuestion?.subtopics, currentQuestion?.skills])

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
    const isIncomplete =
      canInlineEdit &&
      (q.alternatives.length === 0 ||
        q.alternatives.some((a) => !a.explanation?.trim()))

    const base = 'flex shrink-0 items-center justify-center w-full h-7 rounded text-xs font-medium cursor-pointer transition-colors'
    if (isCurrent) {
      return `${base} outline outline-2 outline-cyan-400 outline-offset-0.5 ${
        isIncomplete
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : isAnswered
            ? 'bg-cyan-100 text-cyan-700 border border-cyan-200'
            : 'bg-slate-200 text-slate-700 border border-slate-300'
      }`
    }
    if (isCorrect) return `${base} bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200`
    if (isWrong) return `${base} bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200`
    if (isAnswered) return `${base} bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200`
    if (isIncomplete) return `${base} bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200`
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
          <div className="flex flex-wrap gap-2">
            {isManagementMode && onAddQuestion && (
              <Button
                variant="contained"
                color="primary"
                onClick={onAddQuestion}
                startIcon={<PlusCircleIcon className="w-4 h-4" />}
              >
                Adicionar questão
              </Button>
            )}
            {onBack && (
              <Button variant="outlined" onClick={onBack}>
                Voltar
              </Button>
            )}
          </div>
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
  ]

  const examTitle = examBase ? formatExamBaseTitle(examBase) : null
  const showPlayerTitleBar = examTitle && !trainingProvaMode

  return (
    <>
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      {/* Barra fixa com nome da prova — sempre visível (no treino, o layout já exibe) */}
      {showPlayerTitleBar && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-sm font-semibold text-slate-800 truncate min-w-0" title={examTitle}>
            {examTitle}
          </p>
        </div>
      )}
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
              {canInlineEdit && (
                <Tooltip title="Remover questão" enterDelay={300}>
                  <button
                    type="button"
                    onClick={() => setDeleteQuestionDialogOpen(true)}
                    disabled={deleteQuestionMutation.isPending}
                    aria-label="Remover questão"
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}
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
                  isActive ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50',
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
                  {currentQuestion && (() => {
                    const originalSubtopics = arrayToStringList(currentQuestion.subtopics ?? [])
                    const originalSkills = arrayToStringList(currentQuestion.skills ?? [])
                    const isSubjectChanged = subject !== (currentQuestion.subject ?? '')
                    const isTopicChanged = topic !== (currentQuestion.topic ?? '')
                    const isSubtopicsChanged = subtopicsStr !== originalSubtopics
                    const isSkillsChanged = skillsStr !== originalSkills
                    const isReferenceTextChanged = editReferenceTextValue !== (currentQuestion.referenceText ?? '')
                    const isStatementChanged = editStatementValue !== currentQuestion.statement
                    const isStatementImageUrlChanged = editStatementImageUrl !== (currentQuestion.statementImageUrl ?? '')
                    const changedFieldSx = { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'warning.main', borderWidth: 2 } } }
                    return (
                    <div className="flex flex-col gap-6">
                      {/* Gerar explicações por IA */}
                      {canInlineEdit && (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={handleGenerateExplanations}
                            disabled={
                              generateExplanationsMutation.isPending ||
                              currentQuestion.alternatives.length === 0 ||
                              !currentQuestion.correctAlternative
                            }
                            title={
                              !currentQuestion.correctAlternative
                                ? 'Marque a resposta correta para gerar explicações'
                                : undefined
                            }
                          >
                            {generateExplanationsMutation.isPending ? 'Gerando…' : 'Gerar explicações e metadados por IA'}
                          </Button>
                          {generateExplainError && (
                            <Alert severity="error" onClose={() => setGenerateExplainError(null)} sx={{ py: 0 }}>
                              {generateExplainError}
                            </Alert>
                          )}
                          {disagreementWarning && (
                            <Alert
                              severity="warning"
                              onClose={() => setDisagreementWarning(null)}
                              sx={{ py: 0, '& .MuiAlert-message': { fontWeight: 600 } }}
                            >
                              <strong>Atenção:</strong> A IA identificou possível inconsistência na resposta marcada como correta. Recomendamos revisar a questão.
                              <br />
                              <br />
                              {disagreementWarning}
                            </Alert>
                          )}
                        </div>
                      )}

                      {/* Subject, Topic, Subtopics, Skills */}
                      {canInlineEdit && (
                      <div className="flex flex-col gap-3">
                        {canInlineEdit ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <TextField
                                label="Matéria"
                                size="small"
                                fullWidth
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                sx={isSubjectChanged ? changedFieldSx : undefined}
                              />
                              <TextField
                                label="Tópico"
                                size="small"
                                fullWidth
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                sx={isTopicChanged ? changedFieldSx : undefined}
                              />
                            </div>
                            <TextField
                              label="Subtópicos (separados por vírgula)"
                              size="small"
                              fullWidth
                              value={subtopicsStr}
                              onChange={(e) => setSubtopicsStr(e.target.value)}
                              placeholder="Ex: Direito Constitucional, Direitos Fundamentais"
                              sx={isSubtopicsChanged ? changedFieldSx : undefined}
                            />
                            <TextField
                              label="Habilidades (separadas por vírgula)"
                              size="small"
                              fullWidth
                              value={skillsStr}
                              onChange={(e) => setSkillsStr(e.target.value)}
                              placeholder="Ex: Análise, Interpretação"
                              sx={isSkillsChanged ? changedFieldSx : undefined}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleSaveMetadata}
                              disabled={updateQuestionMutation.isPending}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              {updateQuestionMutation.isPending ? 'Salvando…' : 'Salvar metadados'}
                            </Button>
                          </>
                        ) : (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                            {currentQuestion.subject && (
                              <span><span className="font-medium text-slate-500">Matéria:</span> {currentQuestion.subject}</span>
                            )}
                            {currentQuestion.topic && (
                              <span><span className="font-medium text-slate-500">Tópico:</span> {currentQuestion.topic}</span>
                            )}
                            {(currentQuestion.subtopics?.length ?? 0) > 0 && (
                              <span><span className="font-medium text-slate-500">Subtópicos:</span> {arrayToStringList(currentQuestion.subtopics ?? [])}</span>
                            )}
                            {(currentQuestion.skills?.length ?? 0) > 0 && (
                              <span><span className="font-medium text-slate-500">Habilidades:</span> {arrayToStringList(currentQuestion.skills ?? [])}</span>
                            )}
                          </div>
                        )}
                      </div>
                      )}

                      {(currentQuestion.referenceText || canInlineEdit) && (
                        <div className={`group/ref relative rounded-lg transition-colors ${canInlineEdit && !editingReferenceText ? 'hover:bg-slate-100 p-2' : ''}`}>
                          {canInlineEdit && !editingReferenceText && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Texto de referência
                                {!currentQuestion.referenceText && (
                                  <span className="ml-1 font-normal normal-case text-slate-400">(opcional)</span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditReferenceTextValue(currentQuestion.referenceText ?? '')
                                  setEditingReferenceText(true)
                                }}
                                className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm opacity-0 group-hover/ref:opacity-100 transition-opacity z-10"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {!canInlineEdit && (
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Texto de referência</span>
                          )}
                          {editingReferenceText && canInlineEdit ? (
                            <div className={`flex flex-col gap-2 mt-1 rounded-lg ${isReferenceTextChanged ? 'ring-2 ring-amber-500 ring-inset p-2' : ''}`}>
                              <MarkdownEditor
                                label=""
                                value={editReferenceTextValue}
                                onChange={setEditReferenceTextValue}
                                minHeight={200}
                                placeholder="Texto da prova ao qual a questão se refere"
                                changed={isReferenceTextChanged}
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={handleSaveReferenceText}
                                  disabled={updateQuestionMutation.isPending}
                                >
                                  {updateQuestionMutation.isPending ? 'Salvando…' : 'Salvar'}
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setEditingReferenceText(false)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : currentQuestion.referenceText ? (
                            <div className="mt-1 text-sm text-slate-700">
                              <Markdown>{currentQuestion.referenceText}</Markdown>
                            </div>
                          ) : (
                            <div className="mt-1 text-sm text-slate-400 italic">
                              Nenhum texto de referência. Clique no ícone de editar para adicionar.
                            </div>
                          )}
                        </div>
                      )}
                      {(currentQuestion.statementImageUrl || canInlineEdit) && (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Imagem do enunciado
                            {!currentQuestion.statementImageUrl && canInlineEdit && (
                              <span className="ml-1 font-normal normal-case text-slate-400">(opcional)</span>
                            )}
                          </span>
                          {canInlineEdit && (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={statementImageFileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleStatementImageFile}
                                className="hidden"
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<PhotoIcon className="w-4 h-4" />}
                                onClick={() => statementImageFileInputRef.current?.click()}
                                disabled={uploadingImage}
                              >
                                {uploadingImage ? 'Enviando…' : 'Enviar imagem'}
                              </Button>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editStatementImageUrl}
                                  onChange={(e) => {
                                    setEditStatementImageUrl(e.target.value)
                                    setStatementImageLoadError(false)
                                  }}
                                  placeholder="Ou cole a URL da imagem"
                                  className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[200px] ${
                                    isStatementImageUrlChanged ? 'border-2 border-amber-500' : 'border-slate-300'
                                  }`}
                                />
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={handleApplyStatementImageUrl}
                                  disabled={updateQuestionMutation.isPending}
                                >
                                  Aplicar
                                </Button>
                              </div>
                              {currentQuestion.statementImageUrl && (
                                <Tooltip title="Remover imagem">
                                  <button
                                    type="button"
                                    onClick={handleRemoveStatementImage}
                                    disabled={updateQuestionMutation.isPending}
                                    className="p-2 rounded-lg text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-sm"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          )}
                          {uploadImageError && (
                            <Alert severity="error" onClose={() => setUploadImageError(null)} sx={{ py: 0 }}>
                              {uploadImageError}
                            </Alert>
                          )}
                          {currentQuestion.statementImageUrl ? (
                            <div className="max-w-[560px] rounded-lg border border-slate-300 overflow-hidden">
                              {statementImageLoadError ? (
                                <div className="p-4 text-sm text-slate-500 bg-slate-50">
                                  Não foi possível carregar a imagem.
                                </div>
                              ) : (
                                <img
                                  src={currentQuestion.statementImageUrl}
                                  alt="Enunciado"
                                  className="w-full h-auto block"
                                  onError={() => setStatementImageLoadError(true)}
                                  onLoad={() => setStatementImageLoadError(false)}
                                />
                              )}
                            </div>
                          ) : canInlineEdit ? (
                            <p className="text-sm text-slate-400 italic">
                              Nenhuma imagem. Envie um arquivo ou cole a URL.
                            </p>
                          ) : null}
                        </div>
                      )}
                      <div className={`group relative rounded-lg transition-colors ${canInlineEdit && !editingStatement ? 'hover:bg-slate-100 p-2' : ''}`}>
                        {canInlineEdit && !editingStatement && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditStatementValue(currentQuestion.statement)
                              setEditingStatement(true)
                            }}
                            className="absolute -right-2 -top-2 p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        )}
                        {editingStatement && canInlineEdit ? (
                          <div className={`flex flex-col gap-2 rounded-lg ${isStatementChanged ? 'ring-2 ring-amber-500 ring-inset p-2' : ''}`}>
                            <MarkdownEditor
                              label=""
                              value={editStatementValue}
                              onChange={setEditStatementValue}
                              minHeight={200}
                              placeholder="Enunciado da questão"
                              changed={isStatementChanged}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="contained"
                                size="small"
                                onClick={handleSaveStatement}
                                disabled={updateQuestionMutation.isPending}
                              >
                                {updateQuestionMutation.isPending ? 'Salvando…' : 'Salvar'}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setEditingStatement(false)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-base font-medium text-slate-900">
                            <Markdown>{currentQuestion.statement}</Markdown>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {canInlineEdit && !currentQuestion.correctAlternative && currentQuestion.alternatives.length > 0 && (
                          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 shrink-0" />
                            Marque a resposta correta passando o mouse sobre a alternativa e clicando no ícone ✓
                          </p>
                        )}
                        {currentQuestion.alternatives.map((alt) => {
                          const isEliminated = eliminatedSet.has(alt.id)
                          const isSelected = selectedAlternativeId === alt.id
                          const isCorrect = currentQuestion.correctAlternative === alt.key
                          const isWrong = isFinished && isSelected && !isCorrect
                          const keyLabel = QUESTION_ALTERNATIVE_KEYS[currentQuestion.alternatives.findIndex((a) => a.id === alt.id)] ?? alt.key
                          const showCorrectStyling = isCorrect && (isFinished || canInlineEdit)
                          const optionBg = isFinished
                            ? isCorrect ? 'bg-emerald-50 border-emerald-400' : isWrong ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-300'
                            : showCorrectStyling ? 'bg-emerald-50 border-emerald-400' : isSelected ? 'bg-cyan-50 border-cyan-400' : 'bg-white border-slate-300 hover:bg-slate-50'
                          const keyBadge = isFinished
                            ? isCorrect ? 'bg-emerald-600 text-white' : isWrong ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                            : showCorrectStyling ? 'bg-emerald-600 text-white' : isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-700'
                          const isEditingThis = alt.id in editAlternativeById
                          const editValues = editAlternativeById[alt.id] ?? { text: alt.text, explanation: alt.explanation ?? '' }
                          const isAltTextChanged = editValues.text !== alt.text
                          const isAltExplanationChanged = editValues.explanation !== (alt.explanation ?? '')
                          return (
                            <div key={alt.id} className={`group relative flex items-center gap-2 rounded-lg transition-colors ${canInlineEdit && !isEditingThis ? 'hover:bg-slate-100 p-1.5' : ''}`}>
                              {!isFinished && !canInlineEdit && (
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
                              {isFinished && !canInlineEdit && (
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
                              {canInlineEdit && !isEditingThis && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  {isCorrect ? (
                                    <Tooltip title="Resposta correta">
                                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 shadow-sm">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Correta
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="Marcar como resposta correta">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSetCorrectAlternative(alt.key)
                                        }}
                                        className="p-2 rounded-lg text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm"
                                      >
                                        <CheckCircleIcon className="w-4 h-4" />
                                      </button>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Editar alternativa">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditAlternativeById((prev) => ({
                                          ...prev,
                                          [alt.id]: { text: alt.text, explanation: alt.explanation ?? '' },
                                        }))
                                      }}
                                      className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                                    >
                                      <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip title="Deletar alternativa">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteAlternative(alt.id)
                                      }}
                                      className="p-2 rounded-lg text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-sm"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  </Tooltip>
                                </div>
                              )}
                              {isEditingThis && canInlineEdit ? (
                                <div className={`flex-1 flex flex-col gap-2 p-2 border-2 rounded-lg bg-white ${
                                  isAltTextChanged || isAltExplanationChanged ? 'border-amber-500' : 'border-cyan-400'
                                }`}>
                                  <div className="flex gap-2 items-start">
                                    <span className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}>{keyLabel}</span>
                                    <div className="flex-1 min-w-0">
                                      <MarkdownEditor
                                        label="Texto da alternativa"
                                        value={editValues.text}
                                        onChange={(val) =>
                                          setEditAlternativeById((prev) => ({
                                            ...prev,
                                            [alt.id]: { ...prev[alt.id], text: val },
                                          }))
                                        }
                                        minHeight={140}
                                        changed={isAltTextChanged}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <MarkdownEditor
                                      label="Explicação"
                                      value={editValues.explanation}
                                      onChange={(val) =>
                                        setEditAlternativeById((prev) => ({
                                          ...prev,
                                          [alt.id]: { ...prev[alt.id], explanation: val },
                                        }))
                                      }
                                      minHeight={180}
                                      placeholder="Explicação da alternativa"
                                      changed={isAltExplanationChanged}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="contained"
                                      size="small"
                                      onClick={() => handleSaveAlternative(alt.id)}
                                      disabled={updateAlternativeMutation.isPending}
                                    >
                                      {updateAlternativeMutation.isPending ? 'Salvando…' : 'Salvar'}
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => {
                                        setEditAlternativeById((prev) => {
                                          const next = { ...prev }
                                          delete next[alt.id]
                                          return next
                                        })
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className={`flex gap-3 items-center justify-start w-full p-2 shadow-sm hover:shadow-xs active:shadow-none rounded-lg text-left border transition-colors outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-400 ${isEliminated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${optionBg} ${isFinished || isManagementMode ? 'cursor-default' : ''}`}
                                  onClick={() => handleOptionSelected(currentQuestion.id, alt.id, isEliminated)}
                                  disabled={isEliminated || isFinished || isManagementMode}
                                >
                                  <span className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}>{keyLabel}</span>
                                  <span className="text-sm text-slate-800 flex-1"><Markdown>{alt.text}</Markdown></span>
                                  {canInlineEdit && isCorrect && (
                                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                      <CheckCircleIcon className="w-3.5 h-3.5" />
                                      Correta
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          )
                        })}
                        {canInlineEdit && !showAddAlternative && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setShowAddAlternative(true)}
                            startIcon={<PlusCircleIcon className="w-4 h-4" />}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            Adicionar alternativa
                          </Button>
                        )}
                        {canInlineEdit && showAddAlternative && (
                          <div className="flex flex-col gap-2 p-3 border-2 border-violet-300 rounded-lg bg-violet-50/30">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newAltKey}
                                onChange={(e) => setNewAltKey(e.target.value.toUpperCase())}
                                placeholder="Letra (ex: A)"
                                maxLength={1}
                                className="w-16 p-2 text-center text-sm font-semibold border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                              <textarea
                                value={newAltText}
                                onChange={(e) => setNewAltText(e.target.value)}
                                placeholder="Texto da alternativa..."
                                className="flex-1 p-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[60px] resize-y"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="contained"
                                size="small"
                                onClick={handleAddAlternative}
                                disabled={createAlternativeMutation.isPending}
                              >
                                {createAlternativeMutation.isPending ? 'Adicionando…' : 'Adicionar'}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  setShowAddAlternative(false)
                                  setNewAltKey('')
                                  setNewAltText('')
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
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
                    )
                  })()}
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
                            wrong: 'border-2 border-rose-400 bg-rose-100 overflow-hidden rounded-lg',
                            neutral: 'border border-slate-300 bg-slate-50 overflow-hidden rounded-lg',
                          }
                          const headerTextStyles = { correct: 'text-emerald-800', wrong: 'text-rose-800', neutral: 'text-slate-700' }
                          const badgeCorrect = 'text-xs font-semibold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded'
                          const badgeWrong = 'text-xs font-semibold text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded'
                          const explanationWrapStyles = {
                            correct: 'border-t border-emerald-300 bg-emerald-50/70',
                            wrong: 'border-t border-rose-300 bg-rose-50/70',
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

    <Dialog
      open={deleteQuestionDialogOpen}
      onClose={() => setDeleteQuestionDialogOpen(false)}
      aria-labelledby="delete-question-dialog-title"
      aria-describedby="delete-question-dialog-description"
    >
      <DialogTitle id="delete-question-dialog-title">
        Remover questão?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-question-dialog-description">
          Esta ação removará permanentemente a questão e todas as suas alternativas. Não é possível desfazer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteQuestionDialogOpen(false)}>
          Cancelar
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleDeleteQuestionConfirm}
          disabled={deleteQuestionMutation.isPending}
          autoFocus
        >
          {deleteQuestionMutation.isPending ? 'Removendo…' : 'Remover'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}
