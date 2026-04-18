import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Tooltip,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Link } from '@tanstack/react-router'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { MobileCard, PhoneSafeArea } from '@/ui/mobile'
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
  LockClosedIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlayIcon,
  PlusCircleIcon,
  ScissorsIcon,
  Squares2X2Icon,
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
  useGenerateMetadataMutation,
  useGenerateSubjectMutation,
  useReviewQuestionMutation,
  useRemoveReviewMutation,
  getApiMessage,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'
import { authService } from '@/features/auth/services/auth.service'
import { formatExamBaseTitle } from '@/lib/utils'
import { analytics } from '@/lib/analytics'
import { useIsMobile } from '@/lib/useIsMobile'
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
  /** Optional primary action rendered in the mobile header for training mode. */
  mobileHeaderAction?: React.ReactNode
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
  mobileHeaderAction,
  enableEditMode: _enableEditMode = false,
  managementMode = false,
  onAddQuestion,
}: ExamAttemptPlayerProps) {
  const isRetryMode = Boolean(trainingId)
  const isManagementMode = Boolean(managementMode)
  const isMobile = useIsMobile()
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
  const [mobileQuestionDrawerOpen, setMobileQuestionDrawerOpen] = useState(false)
  const [mobileReferenceExpanded, setMobileReferenceExpanded] = useState(false)
  const [mobileOutgoingQuestion, setMobileOutgoingQuestion] = useState<{
    question: PlayerQuestion
    direction: 'forward' | 'backward'
  } | null>(null)
  const mobilePrevQuestionRef = useRef<PlayerQuestion | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward')
  const [eliminatedByQuestion, setEliminatedByQuestion] = useState<
    Record<string, Set<string>>
  >({})
  const [scrollToAlternativeId, setScrollToAlternativeId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const longPressOriginRef = useRef({ x: 0, y: 0 })
  const swipeStartRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null)
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
  const [generateMetadataError, setGenerateMetadataError] = useState<string | null>(null)
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
  const generateMetadataMutation = useGenerateMetadataMutation(examBaseId ?? '', currentQuestion?.id ?? '')
  const generateSubjectMutation = useGenerateSubjectMutation(examBaseId ?? '', currentQuestion?.id ?? '')
  const generateExplanationsMutation = useGenerateExplanationsMutation(examBaseId ?? '', currentQuestion?.id ?? '')

  // Review mutations
  const reviewQuestionMutation = useReviewQuestionMutation(examBaseId ?? '')
  const removeReviewMutation = useRemoveReviewMutation(examBaseId ?? '')
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
    enabled: isManagementMode,
  })
  const currentUserId = profileData?.user?.id

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

  const handleGenerateMetadata = useCallback(async () => {
    if (!currentQuestion || !examBaseId) return
    setGenerateMetadataError(null)
    try {
      const result = await generateMetadataMutation.mutateAsync({ subject: subject || undefined })
      setTopic(result.topic)
      setSubtopicsStr(arrayToStringList(result.subtopics))
      setSkillsStr(arrayToStringList(result.skills))
      setSnackbarMessage('Metadados preenchidos em rascunho — revise e salve.')
      setSnackbarOpen(true)
    } catch (err) {
      setGenerateMetadataError(getApiMessage(err))
    }
  }, [currentQuestion, examBaseId, subject, generateMetadataMutation])

  const handleGenerateSubject = useCallback(async () => {
    if (!currentQuestion || !examBaseId) return
    try {
      const result = await generateSubjectMutation.mutateAsync()
      setSubject(result.subject)
      setSnackbarMessage('Matéria preenchida em rascunho — revise e salve.')
      setSnackbarOpen(true)
    } catch (err) {
      setSnackbarMessage(getApiMessage(err))
      setSnackbarOpen(true)
    }
  }, [currentQuestion, examBaseId, generateSubjectMutation])

  const handleGenerateExplanations = useCallback(async () => {
    if (!currentQuestion || !examBaseId) return
    setGenerateExplainError(null)
    setDisagreementWarning(null)
    try {
      const result = await generateExplanationsMutation.mutateAsync()
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
      setSnackbarMessage('Explicações geradas e salvas.')
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
    setMobileReferenceExpanded(false)
  }, [currentQuestionIndex])

  useLayoutEffect(() => {
    const nextQuestion = questions.at(currentQuestionIndex)
    if (!nextQuestion) {
      mobilePrevQuestionRef.current = null
      return
    }

    const prev = mobilePrevQuestionRef.current
    if (prev && prev.id !== nextQuestion.id) {
      setMobileOutgoingQuestion({ question: prev, direction: slideDirection })
      const timer = window.setTimeout(() => setMobileOutgoingQuestion(null), 300)
      mobilePrevQuestionRef.current = nextQuestion
      return () => window.clearTimeout(timer)
    }
    mobilePrevQuestionRef.current = nextQuestion
  }, [questions, currentQuestionIndex, slideDirection])

  const analyticsEligible =
    !isManagementMode && !isRetryMode && !isFinished && Boolean(attemptId)

  const questionViewStartRef = useRef<number | null>(null)
  useEffect(() => {
    if (!analyticsEligible || !currentQuestion) return
    const now = Date.now()
    const prevStart = questionViewStartRef.current
    const timeOnPrevQuestionMs = prevStart != null ? now - prevStart : null
    questionViewStartRef.current = now
    analytics.capture('question_viewed', {
      attemptId,
      examBaseId,
      questionId: currentQuestion.id,
      questionIndex: currentQuestionIndex,
      totalQuestions: questionCount,
      timeOnPrevQuestionMs,
    })
  }, [
    analyticsEligible,
    currentQuestion,
    currentQuestionIndex,
    questionCount,
    attemptId,
    examBaseId,
  ])

  useEffect(() => {
    if (!analyticsEligible) return
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      analytics.capture('exam_paused', {
        attemptId,
        examBaseId,
        questionIndex: currentQuestionIndex,
        reason: 'tab_hidden',
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [analyticsEligible, attemptId, examBaseId, currentQuestionIndex])

  // Reset inline editing state when switching questions
  useEffect(() => {
    setEditingStatement(false)
    setEditingReferenceText(false)
    setEditAlternativeById({})
    setGenerateMetadataError(null)
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

  function getQuestionStatus(index: number) {
    const isCurrent = currentQuestionIndex === index
    const q = questions[index]
    if (!q) return { isCurrent, status: 'unanswered' as const }
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

    if (isCorrect) return { isCurrent, status: 'correct' as const }
    if (isWrong) return { isCurrent, status: 'wrong' as const }
    if (isAnswered) return { isCurrent, status: 'answered' as const }
    if (isIncomplete) return { isCurrent, status: 'incomplete' as const }
    return { isCurrent, status: 'unanswered' as const }
  }

  function getQuestionButtonStyle(index: number) {
    const { isCurrent, status } = getQuestionStatus(index)

    const base = 'flex shrink-0 items-center justify-center w-full h-7 rounded text-xs font-medium cursor-pointer transition-colors'
    if (isCurrent) {
      return `${base} outline outline-2 outline-cyan-400 outline-offset-0.5 ${
        status === 'incomplete'
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : status === 'answered'
            ? 'bg-cyan-100 text-cyan-700 border border-cyan-200'
            : status === 'correct'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : status === 'wrong'
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
            : 'bg-slate-200 text-slate-700 border border-slate-300'
      }`
    }
    if (status === 'correct') return `${base} bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200`
    if (status === 'wrong') return `${base} bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200`
    if (status === 'answered') return `${base} bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200`
    if (status === 'incomplete') return `${base} bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200`
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
  const answeredCount = questionCount - unansweredIndices.length
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questionCount - 1

  const comingSoonTooltip = 'Em breve disponível. Estamos trabalhando nisso.'
  const tabButtons = [
    { value: 0, label: 'Questão', icon: PlayIcon },
    { value: 1, label: 'Explicação', icon: BookOpenIcon, disabled: !isFinished },
    { value: 2, label: 'Estatísticas', icon: ChartBarIcon, comingSoon: true },
    { value: 3, label: 'Comentários', icon: ChatBubbleLeftRightIcon, comingSoon: true },
    { value: 4, label: 'Histórico', icon: ClockIcon, comingSoon: true },
    { value: 5, label: 'Notas', icon: PencilSquareIcon, comingSoon: true },
  ]

  if (isMobile && !canInlineEdit) {
    const playerTitle = examBase
      ? formatExamBaseTitle(examBase)
      : isRetryMode
        ? 'Re-tentativa'
        : 'Prova'
    const mobileHeaderButtonSx = {
      minHeight: 40,
      minWidth: 0,
      px: 2,
      borderRadius: '14px',
      textTransform: 'none',
      fontWeight: 800,
      boxShadow: 'none',
      whiteSpace: 'nowrap',
    }
    const defaultMobileHeaderAction = trainingProvaMode ? null : (
      isFinished ? (
        isRetryMode && onNavigateToFinal ? (
          <Button
            variant="contained"
            color="primary"
            disableElevation
            onClick={onNavigateToFinal}
            sx={mobileHeaderButtonSx}
          >
            Resultado
          </Button>
        ) : feedbackLink ? (
          <Link
            to="/exams/$examBoard/$examId/$attemptId/feedback"
            params={feedbackLink}
            className="block no-underline"
          >
            <Button
              variant="contained"
              color="primary"
              disableElevation
              sx={mobileHeaderButtonSx}
            >
              Feedback
            </Button>
          </Link>
        ) : null
      ) : (
        <Button
          variant="contained"
          color="primary"
          disableElevation
          onClick={handleFinish}
          disabled={isFinishPending}
          sx={mobileHeaderButtonSx}
        >
          {isFinishPending ? 'Finalizando…' : 'Finalizar'}
        </Button>
      )
    )
    const resolvedMobileHeaderAction = trainingProvaMode
      ? mobileHeaderAction
      : defaultMobileHeaderAction
    const questionMetaLabel = `${answeredCount}/${questionCount}`
    const progressPercent = (answeredCount / Math.max(questionCount, 1)) * 100
    const positionLabel = `Questão ${currentQuestionIndex + 1} de ${questionCount}`

    const handleSwipeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length !== 1) {
        swipeStartRef.current = null
        return
      }
      const target = e.target as HTMLElement | null
      if (target && target.closest('[data-no-swipe="true"], input, textarea, [contenteditable="true"]')) {
        swipeStartRef.current = null
        return
      }
      const t = e.touches[0]
      swipeStartRef.current = { x: t.clientX, y: t.clientY, target: e.target }
    }
    const handleSwipeTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      const start = swipeStartRef.current
      swipeStartRef.current = null
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const SWIPE_MIN = 60
      if (Math.abs(dx) < SWIPE_MIN) return
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return
      if (dx < 0 && !isLastQuestion) handleNextQuestion()
      else if (dx > 0 && !isFirstQuestion) handlePrevQuestion()
    }

    const renderMobilePane = (q: PlayerQuestion) => {
      const paneSelectedAltId = answers[q.id] ?? null
      const paneEliminatedSet = eliminatedByQuestion[q.id] ?? new Set<string>()
      return value === 0 ? (
        <div className="px-2">
          <MobileCard className="space-y-5">
            {q.referenceText ? (() => {
              const isLong = q.referenceText.length > 240
              const shouldCollapse = isLong && !mobileReferenceExpanded
              return (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Texto de referência
                    </p>
                    {isLong ? (
                      <button
                        type="button"
                        onClick={() => setMobileReferenceExpanded((v) => !v)}
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50"
                      >
                        {mobileReferenceExpanded ? 'Ocultar' : 'Ler texto'}
                      </button>
                    ) : null}
                  </div>
                  <div
                    className={`mt-2 text-sm text-slate-700 ${
                      shouldCollapse
                        ? 'relative max-h-24 overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-gradient-to-t after:from-slate-50 after:to-transparent'
                        : ''
                    }`}
                  >
                    <Markdown>{q.referenceText}</Markdown>
                  </div>
                </div>
              )
            })() : null}

            {q.statementImageUrl && !statementImageLoadError ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img
                  src={q.statementImageUrl}
                  alt="Imagem do enunciado"
                  className="max-h-[280px] w-full object-contain bg-slate-50"
                  onError={() => setStatementImageLoadError(true)}
                />
              </div>
            ) : null}

            <div className="text-base font-medium leading-7 text-slate-900">
              <Markdown>{q.statement}</Markdown>
            </div>

            <div className="space-y-3">
              {q.alternatives.map((alt, index) => {
                const isEliminated = paneEliminatedSet.has(alt.id)
                const isSelected = paneSelectedAltId === alt.id
                const isCorrect = q.correctAlternative === alt.key
                const isWrong = isFinished && isSelected && !isCorrect
                const keyLabel = QUESTION_ALTERNATIVE_KEYS[index] ?? alt.key
                const showCorrectStyling = isCorrect && isFinished
                const optionBg = isFinished
                  ? isCorrect
                    ? 'bg-emerald-50 border-emerald-400'
                    : isWrong
                      ? 'bg-rose-50 border-rose-400'
                      : 'bg-white border-slate-200'
                  : showCorrectStyling
                    ? 'bg-emerald-50 border-emerald-400'
                    : isSelected
                      ? 'bg-cyan-50 border-cyan-400'
                      : 'bg-white border-slate-200'
                const keyBadge = isFinished
                  ? isCorrect
                    ? 'bg-emerald-600 text-white'
                    : isWrong
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  : isSelected
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-200 text-slate-700'

                const clearLongPress = () => {
                  if (longPressTimerRef.current !== null) {
                    window.clearTimeout(longPressTimerRef.current)
                    longPressTimerRef.current = null
                  }
                }
                const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
                  if (isFinished) return
                  longPressTriggeredRef.current = false
                  longPressOriginRef.current = { x: e.clientX, y: e.clientY }
                  clearLongPress()
                  longPressTimerRef.current = window.setTimeout(() => {
                    longPressTriggeredRef.current = true
                    toggleEliminated(q.id, alt.id, !isEliminated)
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      navigator.vibrate(30)
                    }
                  }, 500)
                }
                const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
                  if (longPressTimerRef.current === null) return
                  const dx = e.clientX - longPressOriginRef.current.x
                  const dy = e.clientY - longPressOriginRef.current.y
                  if (dx * dx + dy * dy > 100) clearLongPress()
                }
                const handleClick = () => {
                  clearLongPress()
                  if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false
                    return
                  }
                  if (isFinished || isEliminated) return
                  handleOptionSelected(q.id, alt.id, isEliminated)
                }

                return (
                  <div key={alt.id} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={clearLongPress}
                      onPointerLeave={clearLongPress}
                      onPointerCancel={clearLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={handleClick}
                      disabled={isFinished}
                      aria-label={
                        isEliminated
                          ? `Alternativa ${keyLabel} eliminada. Pressione e segure para desfazer.`
                          : `Alternativa ${keyLabel}. Toque para selecionar, pressione e segure para eliminar.`
                      }
                      className={`flex min-h-16 flex-1 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors select-none touch-manipulation ${optionBg} ${
                        isEliminated ? 'opacity-60' : ''
                      }`}
                    >
                      <span
                        className={`flex h-9 min-w-9 items-center justify-center rounded-xl text-sm font-semibold ${
                          isEliminated
                            ? 'bg-amber-100 text-amber-700'
                            : keyBadge
                        }`}
                      >
                        {isEliminated ? (
                          <ScissorsIcon className="h-4 w-4" />
                        ) : (
                          keyLabel
                        )}
                      </span>
                      <span
                        className={`flex min-h-9 flex-1 items-center text-sm leading-6 ${
                          isEliminated
                            ? 'text-slate-400 line-through'
                            : 'text-slate-800'
                        }`}
                      >
                        <Markdown>{alt.text}</Markdown>
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
            {!isFinished ? (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ScissorsIcon className="h-3 w-3" />
                Pressione e segure uma alternativa para eliminá-la.
              </p>
            ) : null}
          </MobileCard>
        </div>
      ) : (
        <div className="px-2">
          <MobileCard className="space-y-4">
            {!isFinished ? (
              <p className="text-sm text-slate-500">
                As explicações ficam disponíveis após você finalizar a prova.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">
                  Resposta correta: {q.correctAlternative ?? '—'}
                </p>
                <div className="space-y-4">
                  {q.alternatives.map((alt, index) => {
                    const keyLabel = QUESTION_ALTERNATIVE_KEYS[index] ?? alt.key
                    const isCorrect = q.correctAlternative === alt.key
                    const wasSelected = paneSelectedAltId === alt.id
                    const isWrong = wasSelected && !isCorrect
                    const variant = isCorrect
                      ? 'correct'
                      : isWrong
                        ? 'wrong'
                        : 'neutral'
                    const cardStyles = {
                      correct: 'rounded-2xl overflow-hidden border-2 border-emerald-400 bg-emerald-100',
                      wrong: 'rounded-2xl overflow-hidden border-2 border-rose-400 bg-rose-100',
                      neutral: 'rounded-2xl overflow-hidden border border-slate-200 bg-slate-50',
                    }
                    const headerTextStyles = {
                      correct: 'text-emerald-800',
                      wrong: 'text-rose-800',
                      neutral: 'text-slate-700',
                    }
                    const explanationWrapStyles = {
                      correct: 'border-t border-emerald-300 bg-emerald-50/70',
                      wrong: 'border-t border-rose-300 bg-rose-50/70',
                      neutral: 'border-t border-slate-200 bg-slate-100/70',
                    }

                    return (
                      <div key={alt.id} className={cardStyles[variant]}>
                        <div className="p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${headerTextStyles[variant]}`}>
                              {keyLabel}.
                            </span>
                            {isCorrect ? (
                              <span className="rounded bg-emerald-200/80 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                Resposta correta
                              </span>
                            ) : null}
                            {isWrong ? (
                              <span className="rounded bg-rose-200/80 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                Sua resposta
                              </span>
                            ) : null}
                          </div>
                          <div className={`text-sm ${headerTextStyles[variant]}`}>
                            <Markdown>{alt.text}</Markdown>
                          </div>
                        </div>
                        <div className={`p-4 ${explanationWrapStyles[variant]}`}>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Explicação
                          </p>
                          {alt.explanation ? (
                            <div className="text-sm text-slate-700">
                              <Markdown>{alt.explanation}</Markdown>
                            </div>
                          ) : (
                            <p className="text-sm italic text-slate-500">
                              Sem explicação cadastrada.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </MobileCard>
        </div>
      )
    }

    return (
      <>
        <div
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-[calc(7rem+var(--safe-area-inset-bottom))]"
          onTouchStart={handleSwipeTouchStart}
          onTouchEnd={handleSwipeTouchEnd}
          onTouchCancel={() => { swipeStartRef.current = null }}
        >
          <PhoneSafeArea
            top
            className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="size-5" />
                </button>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="truncate text-xs font-medium text-slate-500">
                  {playerTitle}
                </p>
                <div className="flex items-center gap-2" aria-label={`${answeredCount} de ${questionCount} respondidas`}>
                  <span className="shrink-0 text-xs font-semibold text-slate-700">
                    {questionMetaLabel}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              {resolvedMobileHeaderAction ? (
                <div className="shrink-0">{resolvedMobileHeaderAction}</div>
              ) : null}
            </div>
          </PhoneSafeArea>

          <div className="px-2">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              {tabButtons
                .filter((tab) => tab.value === 0 || tab.value === 1)
                .map((tab) => {
                  const isActive = value === tab.value
                  const isDisabled = tab.disabled ?? false
                  const Icon = isDisabled
                    ? LockClosedIcon
                    : tab.value === 1 && currentQuestionHasWrongAnswer && value !== 1
                      ? BookOpenIconSolid
                      : tab.icon

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => !isDisabled && handleChange(null as any, tab.value)}
                      disabled={isDisabled}
                      aria-label={isDisabled ? `${tab.label} (bloqueado até finalizar a prova)` : tab.label}
                      className={`flex items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500'
                      } ${isDisabled ? 'text-slate-400' : ''}`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          tab.value === 1 && !isDisabled && currentQuestionHasWrongAnswer && value !== 1
                            ? 'text-amber-500'
                            : ''
                        }`}
                      />
                      {tab.label}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="question-swipe-container">
            {mobileOutgoingQuestion ? (
              <div
                key={`outgoing-${mobileOutgoingQuestion.question.id}`}
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 pointer-events-none ${
                  mobileOutgoingQuestion.direction === 'forward'
                    ? 'question-swipe-out-to-left'
                    : 'question-swipe-out-to-right'
                }`}
              >
                {renderMobilePane(mobileOutgoingQuestion.question)}
              </div>
            ) : null}
            <div
              key={currentQuestion.id}
              className={
                mobileOutgoingQuestion
                  ? slideDirection === 'forward'
                    ? 'question-swipe-in-from-right'
                    : 'question-swipe-in-from-left'
                  : ''
              }
            >
              {renderMobilePane(currentQuestion)}
            </div>
          </div>
        </div>

        <Drawer
          anchor="bottom"
          open={mobileQuestionDrawerOpen}
          onClose={() => setMobileQuestionDrawerOpen(false)}
        >
          <PhoneSafeArea bottom className="rounded-t-3xl bg-white">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="max-h-[80dvh] overflow-auto px-4 pb-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Navegar entre questões
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Toque em um número para trocar rapidamente de questão.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileQuestionDrawerOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700"
                  aria-label="Fechar navegador de questões"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  Não respondida
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full bg-cyan-400" />
                  Respondida
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  Errada
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  Correta
                </div>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {questions.map((_, index) => (
                  <button
                    key={questions[index].id}
                    type="button"
                    onClick={() => {
                      handleSelectQuestion(index)
                      setMobileQuestionDrawerOpen(false)
                    }}
                    className={getQuestionButtonStyle(index).replace(
                      'w-full h-7',
                      'w-11 h-11',
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </PhoneSafeArea>
        </Drawer>

        <PhoneSafeArea
          bottom
          className="fixed inset-x-0 bottom-0 z-50 px-3"
        >
          <div className="mx-auto max-w-md overflow-hidden rounded-t-[28px] border border-b-0 border-slate-200 bg-white/98 shadow-[0_-18px_48px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="grid grid-cols-[52px_minmax(0,1fr)_52px] items-center gap-2 px-3 pb-2 pt-3">
              <button
                type="button"
                onClick={handlePrevQuestion}
                disabled={isFirstQuestion}
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border transition-colors ${
                  isFirstQuestion
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
                aria-label="Voltar para a questão anterior"
              >
                <ChevronLeftIcon className={`h-5 w-5 ${isFirstQuestion ? 'text-slate-300' : 'text-slate-500'}`} />
              </button>

              <button
                type="button"
                onClick={() => setMobileQuestionDrawerOpen(true)}
                className="flex h-[52px] min-w-0 flex-col items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-700 transition-colors"
                aria-label={`${positionLabel}. Abrir lista de questões.`}
              >
                <span className="truncate text-sm font-semibold leading-tight">{positionLabel}</span>
                <span className="text-[11px] font-medium text-slate-500 leading-tight">Ver todas</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={isLastQuestion}
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border transition-colors ${
                  isLastQuestion
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-cyan-600 bg-cyan-600 text-white shadow-[0_14px_28px_rgba(8,145,178,0.28)]'
                }`}
                aria-label="Ir para a próxima questão"
              >
                <ChevronRightIcon className={`h-5 w-5 ${isLastQuestion ? 'text-slate-300' : 'text-white'}`} />
              </button>
            </div>
          </div>
        </PhoneSafeArea>

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
                      {/* Review bar */}
                      {canInlineEdit && (() => {
                        const mq = managementQuestions[currentQuestionIndex]
                        const myReview = mq?.reviews?.find((r: { reviewerId: string }) => r.reviewerId === currentUserId)
                        const isCreator = mq?.createdById === currentUserId
                        const reviewCount = mq?.reviews?.length ?? 0
                        return (
                          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                            reviewCount > 0
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}>
                            {reviewCount > 0 ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
                            ) : (
                              <span className="w-5 h-5 rounded-full border-2 border-amber-400 shrink-0" />
                            )}
                            <span className={`text-sm flex-1 ${reviewCount > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                              {myReview
                                ? 'Você revisou esta questão'
                                : reviewCount > 0
                                  ? `${reviewCount} revisão(ões)`
                                  : 'Aguardando revisão'}
                            </span>
                            {myReview ? (
                              <Button
                                size="small"
                                color="inherit"
                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                                onClick={() => removeReviewMutation.mutate(currentQuestion.id)}
                                disabled={removeReviewMutation.isPending}
                              >
                                Desfazer
                              </Button>
                            ) : isCreator ? (
                              <span className="text-xs text-amber-600 italic">
                                Outro admin precisa revisar
                              </span>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                                onClick={() => reviewQuestionMutation.mutate(currentQuestion.id)}
                                disabled={reviewQuestionMutation.isPending}
                              >
                                {reviewQuestionMutation.isPending ? 'Revisando…' : 'Aprovar revisão'}
                              </Button>
                            )}
                          </div>
                        )
                      })()}
                      {/* Ações de IA */}
                      {canInlineEdit && (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-row gap-2 flex-wrap">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AutoAwesomeIcon />}
                              onClick={handleGenerateMetadata}
                              disabled={
                                generateMetadataMutation.isPending ||
                                generateExplanationsMutation.isPending ||
                                currentQuestion.alternatives.length === 0
                              }
                            >
                              {generateMetadataMutation.isPending ? 'Gerando…' : 'Gerar metadados por IA'}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AutoAwesomeIcon />}
                              onClick={handleGenerateExplanations}
                              disabled={
                                generateExplanationsMutation.isPending ||
                                generateMetadataMutation.isPending ||
                                currentQuestion.alternatives.length === 0 ||
                                !currentQuestion.correctAlternative
                              }
                              title={
                                !currentQuestion.correctAlternative
                                  ? 'Marque a resposta correta para gerar explicações'
                                  : undefined
                              }
                            >
                              {generateExplanationsMutation.isPending ? 'Gerando…' : 'Gerar explicações por IA'}
                            </Button>
                          </div>
                          {generateMetadataError && (
                            <Alert severity="error" onClose={() => setGenerateMetadataError(null)} sx={{ py: 0 }}>
                              {generateMetadataError}
                            </Alert>
                          )}
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
                                slotProps={{
                                  input: {
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <Tooltip title="Descobrir matéria por IA">
                                          <span>
                                            <IconButton
                                              size="small"
                                              onClick={handleGenerateSubject}
                                              disabled={generateSubjectMutation.isPending}
                                            >
                                              <AutoAwesomeIcon fontSize="small" />
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      </InputAdornment>
                                    ),
                                  },
                                }}
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
            {canInlineEdit && (() => {
              const reviewed = managementQuestions.filter((q) => q.reviews && q.reviews.length > 0).length
              const total = managementQuestions.length
              return (
                <div className="mb-2 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500">Revisão</span>
                    <span className={`text-xs font-semibold ${reviewed === total && total > 0 ? 'text-green-600' : 'text-slate-500'}`}>
                      {reviewed}/{total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${reviewed === total && total > 0 ? 'bg-green-500' : 'bg-amber-400'}`}
                      style={{ width: total > 0 ? `${(reviewed / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )
            })()}
            <span className="text-xs font-medium text-slate-500 block mb-2 shrink-0">Questões</span>
            <div className="overflow-auto min-h-0 p-1.5">
              <div className="grid grid-cols-5 gap-1 content-start">
                {questions.map((_, index) => {
                  const q = managementQuestions[index]
                  const hasReview = canInlineEdit && q?.reviews && q.reviews.length > 0
                  return (
                  <button
                    key={questions[index].id}
                    type="button"
                    onClick={() => handleSelectQuestion(index)}
                    className={`relative ${getQuestionButtonStyle(index)}`}
                  >
                    {index + 1}
                    {canInlineEdit && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${hasReview ? 'bg-green-500' : 'bg-amber-400'}`} />
                    )}
                  </button>
                  )
                })}
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
