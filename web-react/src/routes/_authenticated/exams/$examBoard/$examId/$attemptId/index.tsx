import { Alert, Button, Tooltip } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import {
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PencilSquareIcon,
  PlayIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import {
  useExamBaseAttemptQuery,
  useUpsertExamBaseAttemptAnswerMutation,
  useFinishExamBaseAttemptMutation,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import type { ExamBaseQuestionAlternative } from '@/features/examBaseQuestion/domain/examBaseQuestion.types'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/',
)({
  component: RouteComponent,
})

const QUESTION_ALTERNATIVE_KEYS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
]

function RouteComponent() {
  const { examBoard, examId, attemptId } = Route.useParams()
  const navigate = useNavigate()
  const examBaseId = examId

  const { data, isLoading, error } = useExamBaseAttemptQuery(
    examBaseId,
    attemptId,
  )
  const upsertAnswer = useUpsertExamBaseAttemptAnswerMutation(
    examBaseId,
    attemptId,
  )
  const finishAttempt = useFinishExamBaseAttemptMutation(examBaseId, attemptId)

  const [value, setValue] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [eliminatedByQuestion, setEliminatedByQuestion] = useState<
    Record<string, Set<string>>
  >({})

  const questions = data?.questions ?? []
  const answers = data?.answers ?? {}
  const isFinished = Boolean(data?.attempt.finishedAt)
  const currentQuestion = questions[currentQuestionIndex]
  const questionCount = questions.length

  function getQuestionButtonStyle(index: number) {
    const isCurrent = currentQuestionIndex === index
    const q = questions[index]
    if (!q) return 'flex shrink-0 items-center justify-center w-full aspect-square rounded-lg border border-slate-300 bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 cursor-pointer'
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

    const base = 'flex shrink-0 items-center justify-center w-full aspect-square rounded-lg text-sm font-medium cursor-pointer transition-colors'
    if (isCurrent) {
      return `${base} outline-2 outline-blue-400 outline-offset-1 ${
        isAnswered ? 'bg-blue-500 text-white border border-blue-500' : 'bg-slate-700 text-white border border-slate-700'
      }`
    }
    if (isCorrect) return `${base} bg-green-500 text-white border border-green-500 hover:bg-green-600`
    if (isWrong) return `${base} bg-red-500 text-white border border-red-500 hover:bg-red-600`
    if (isAnswered) return `${base} bg-blue-500 text-white border border-blue-500 hover:bg-blue-600`
    return `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`
  }

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 1 && !isFinished) return
    setValue(newValue)
  }

  const handlePrevQuestion = () => {
    setCurrentQuestionIndex((i) => Math.max(0, i - 1))
  }

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((i) => Math.min(questionCount - 1, i + 1))
  }

  const handleSelectQuestion = (index: number) => {
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

  const handleOptionSelected = (
    questionId: string,
    alternativeId: string,
    isEliminated: boolean,
  ) => {
    if (isEliminated) return
    const current = answers[questionId]
    const nextId = current === alternativeId ? null : alternativeId
    upsertAnswer.mutate({
      questionId,
      selectedAlternativeId: nextId,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Prova" />
        <Card noElevation className="p-4">
          <span className="text-sm text-slate-500">Carregando prova…</span>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Prova" />
        <Card noElevation className="flex flex-col gap-3 p-4">
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Tentativa não encontrada.'}
          </Alert>
          <Button
            variant="outlined"
            onClick={() =>
              navigate({
                to: '/exams/$examBoard/$examId',
                params: { examBoard, examId },
              })
            }
          >
            Voltar à prova
          </Button>
        </Card>
      </div>
    )
  }

  if (questionCount === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Prova" />
        <Card noElevation className="flex flex-col gap-3 p-4">
          <span className="text-sm text-slate-600">Esta prova não tem questões.</span>
          <Button
            variant="outlined"
            onClick={() =>
              navigate({
                to: '/exams/$examBoard/$examId',
                params: { examBoard, examId },
              })
            }
          >
            Voltar à prova
          </Button>
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

  const tabButtons = [
    { value: 0, label: 'Questão', icon: PlayIcon },
    { value: 1, label: 'Explicação', icon: BookOpenIcon, disabled: !isFinished },
    { value: 2, label: 'Estatísticas', icon: ChartBarIcon },
    { value: 3, label: 'Comentários', icon: ChatBubbleLeftRightIcon },
    { value: 4, label: 'Histórico', icon: ClockIcon },
    { value: 5, label: 'Notas', icon: PencilSquareIcon },
  ]

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
      <PageHeader title={`Prova · Questão ${currentQuestionIndex + 1} de ${questionCount}`} />

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Coluna principal: navegação + conteúdo da questão */}
        <div className="flex flex-col gap-3 flex-1 min-w-0 min-h-0 overflow-hidden">
          <Card noElevation className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                aria-label="Questão anterior"
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-24 text-center">
                {currentQuestionIndex + 1} / {questionCount}
              </span>
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questionCount - 1}
                aria-label="Próxima questão"
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </Card>

          <Card noElevation className="flex flex-col flex-1 min-h-0 p-0">
            {/* Tabs estilo consistente */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {tabButtons.map((tab) => {
                const Icon = tab.icon
                const isActive = value === tab.value
                const isDisabled = tab.disabled ?? false
                return (
                  <Tooltip
                    key={tab.value}
                    title={isDisabled ? 'Disponível após finalizar a prova.' : ''}
                  >
                    <span className="flex">
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleChange(null as any, tab.value)}
                        disabled={isDisabled}
                        className={`
                          flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                          border-b-2 transition-colors
                          ${isActive
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    </span>
                  </Tooltip>
                )
              })}
            </div>

            <div className="flex-1 overflow-auto p-4">
              <CustomTabPanel value={value} hidden={value !== 0}>
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
                        <img
                          src={currentQuestion.statementImageUrl}
                          alt="Enunciado"
                          className="w-full h-auto block"
                        />
                      </div>
                    )}
                    <div className="text-base font-medium text-slate-900">
                      <Markdown>{currentQuestion.statement}</Markdown>
                    </div>
                    <div className="flex flex-col gap-2">
                      {currentQuestion.alternatives.map(
                        (alt: ExamBaseQuestionAlternative) => {
                          const isEliminated = eliminatedSet.has(alt.id)
                          const isSelected = selectedAlternativeId === alt.id
                          const isCorrect =
                            currentQuestion.correctAlternative === alt.key
                          const isWrong =
                            isFinished && isSelected && !isCorrect
                          const keyLabel =
                            QUESTION_ALTERNATIVE_KEYS[
                              currentQuestion.alternatives.findIndex(
                                (a) => a.id === alt.id,
                              )
                            ] ?? alt.key
                          const optionBg = isFinished
                            ? isCorrect
                              ? 'bg-green-50 border-green-400'
                              : isWrong
                                ? 'bg-red-50 border-red-400'
                                : 'bg-slate-50 border-slate-300'
                            : isSelected
                              ? 'bg-blue-50 border-blue-400'
                              : 'bg-white border-slate-300 hover:bg-slate-50'
                          const keyBadge = isFinished
                            ? isCorrect
                              ? 'bg-green-600 text-white'
                              : isWrong
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            : isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          return (
                            <div
                              key={alt.id}
                              className="group flex items-center gap-2 relative"
                            >
                              <Tooltip title={isEliminated ? 'Desfazer eliminação' : 'Eliminar alternativa'}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleEliminated(
                                      currentQuestion.id,
                                      alt.id,
                                      !isEliminated,
                                    )
                                  }
                                  disabled={isFinished}
                                  aria-label={isEliminated ? 'Desfazer eliminação' : 'Eliminar alternativa'}
                                  className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 shrink-0 transition-opacity ${isEliminated ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                >
                                  <ScissorsIcon className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              <button
                                type="button"
                                className={`
                                  flex gap-3 items-center justify-start w-full p-3 rounded-lg text-left border-2 transition-colors
                                  ${isEliminated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  ${optionBg}
                                  ${isFinished ? 'cursor-default' : ''}`}
                                onClick={() =>
                                  handleOptionSelected(
                                    currentQuestion.id,
                                    alt.id,
                                    isEliminated,
                                  )
                                }
                                disabled={isEliminated || isFinished}
                              >
                                <span
                                  className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}
                                >
                                  {keyLabel}
                                </span>
                                <span className="text-sm text-slate-800 flex-1">
                                  <Markdown>{alt.text}</Markdown>
                                </span>
                              </button>
                            </div>
                          )
                        },
                      )}
                    </div>
                  </div>
                )}
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 1}>
                <div className="flex flex-col gap-4">
                  {!isFinished && (
                    <span className="text-sm text-slate-500">
                      As explicações ficam disponíveis após você finalizar a prova.
                    </span>
                  )}
                  {isFinished && currentQuestion && (
                    <>
                      <p className="text-sm font-semibold text-slate-700">
                        Resposta correta: {currentQuestion.correctAlternative ?? '—'}
                      </p>
                      <ul className="list-none p-0 m-0 flex flex-col gap-3">
                        {currentQuestion.alternatives.map((alt, idx) => {
                          const keyLabel = QUESTION_ALTERNATIVE_KEYS[idx] ?? alt.key
                          const isCorrect = currentQuestion.correctAlternative === alt.key
                          const wasSelected = selectedAlternativeId === alt.id
                          const isWrong = wasSelected && !isCorrect
                          const boxClass = isCorrect
                            ? 'border-green-400 bg-green-50'
                            : isWrong
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-slate-50'
                          return (
                            <li
                              key={alt.id}
                              className={`p-4 rounded-lg border-2 ${boxClass}`}
                            >
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-slate-700'}`}>
                                  {keyLabel}.
                                </span>
                                {isCorrect && (
                                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                    Resposta correta
                                  </span>
                                )}
                                {isWrong && (
                                  <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                    Sua resposta
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-700 mb-2">
                                <Markdown>{alt.text}</Markdown>
                              </div>
                              {alt.explanation ? (
                                <div className="text-sm text-slate-600">
                                  <Markdown>{alt.explanation}</Markdown>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500 italic">Sem explicação cadastrada.</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 2}>
                <div className="py-2">
                  <span className="text-sm text-slate-500">Estatísticas (em breve)</span>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 3}>
                <div className="py-2">
                  <span className="text-sm text-slate-500">Comentários (em breve)</span>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 4}>
                <div className="py-2">
                  <span className="text-sm text-slate-500">Histórico (em breve)</span>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 5}>
                <div className="py-2">
                  <span className="text-sm text-slate-500">Notas (em breve)</span>
                </div>
              </CustomTabPanel>
            </div>
          </Card>
        </div>

        {/* Sidebar: finalizar + grid de questões */}
        <div className="flex flex-col gap-3 w-56 shrink-0 min-h-0 overflow-hidden">
          <Card noElevation className="p-3 shrink-0">
            {isFinished ? (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() =>
                  navigate({
                    to: '/exams/$examBoard/$examId/$attemptId/feedback',
                    params: { examBoard, examId, attemptId },
                  } as any)
                }
              >
                Ver feedback
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => finishAttempt.mutate()}
                disabled={finishAttempt.isPending}
              >
                {finishAttempt.isPending ? 'Finalizando…' : 'Finalizar prova'}
              </Button>
            )}
          </Card>
          <Card noElevation className="p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
            <span className="text-xs font-medium text-slate-500 block mb-2 shrink-0">Questões</span>
            <div className="grid grid-cols-4 gap-1.5 overflow-auto min-h-0 content-start">
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
          </Card>
        </div>
      </div>
    </div>
  )
}
