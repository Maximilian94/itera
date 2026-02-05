import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import InsightsIcon from '@mui/icons-material/Insights'
import ForumIcon from '@mui/icons-material/Forum'
import HistoryIcon from '@mui/icons-material/History'
import NoteIcon from '@mui/icons-material/Note'
import React, { useState } from 'react'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
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
    if (!q) return 'bg-slate-700 hover:bg-slate-600'
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

    const base =
      'flex shrink-0 items-center justify-center w-full h-8 rounded-sm cursor-pointer'
    if (isCurrent) {
      return `${base} outline-2 outline-violet-400 outline-offset-1 ${
        isAnswered ? 'bg-violet-400 text-white' : 'bg-slate-700 text-white'
      }`
    }
    if (isCorrect) return `${base} bg-green-500 text-white hover:bg-green-600`
    if (isWrong) return `${base} bg-red-500 text-white hover:bg-red-600`
    if (isAnswered) return `${base} bg-violet-400 text-white hover:bg-violet-500`
    return `${base} bg-slate-700 hover:bg-slate-600`
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
      <div className="p-4">
        <Typography color="text.secondary">Carregando prova…</Typography>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <Alert severity="error" sx={{ mb: 2 }}>
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
      </div>
    )
  }

  if (questionCount === 0) {
    return (
      <div className="p-4">
        <Alert severity="info">Esta prova não tem questões.</Alert>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() =>
            navigate({
              to: '/exams/$examBoard/$examId',
              params: { examBoard, examId },
            })
          }
        >
          Voltar à prova
        </Button>
      </div>
    )
  }

  const selectedAlternativeId = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null
  const eliminatedSet = currentQuestion
    ? eliminatedByQuestion[currentQuestion.id] ?? new Set()
    : new Set<string>()

  return (
    <div className="p-4">
      <Grid container spacing={2}>
        <Grid size={10}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-start">
                <IconButton
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  aria-label="Questão anterior"
                >
                  <ArrowBackIosNewIcon />
                </IconButton>
                <Typography variant="body1" component="p">
                  {currentQuestionIndex + 1}/{questionCount}
                </Typography>
                <IconButton
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questionCount - 1}
                  aria-label="Próxima questão"
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </div>
            </div>

            <Paper sx={{ backgroundColor: 'var(--bg-slate-900)' }}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="abas da questão"
              >
                <Tab label="Questão" icon={<PlayArrowIcon />} iconPosition="start" />
                {isFinished ? (
                  <Tab label="Explanation" icon={<AutoStoriesIcon />} iconPosition="start" />
                ) : (
                  <Tooltip title="As explicações ficam disponíveis após você finalizar a prova.">
                    <span>
                      <Tab
                        label="Explanation"
                        icon={<AutoStoriesIcon />}
                        iconPosition="start"
                        disabled
                      />
                    </span>
                  </Tooltip>
                )}
                <Tab label="Statistics" icon={<InsightsIcon />} iconPosition="start" />
                <Tab label="Comments" icon={<ForumIcon />} iconPosition="start" />
                <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
                <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
              </Tabs>

              <CustomTabPanel value={value} hidden={value !== 0}>
                {currentQuestion && (
                  <div className="flex flex-col gap-6 p-4">
                    {currentQuestion.referenceText && (
                      <div>
                        <Typography variant="subtitle2" color="text.secondary">
                          Texto de referência
                        </Typography>
                        <Markdown variant="body2">
                          {currentQuestion.referenceText}
                        </Markdown>
                      </div>
                    )}
                    {currentQuestion.statementImageUrl && (
                      <Box
                        sx={{
                          maxWidth: 560,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={currentQuestion.statementImageUrl}
                          alt="Enunciado"
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </Box>
                    )}
                    <Typography variant="h6" component="div">
                      <Markdown>{currentQuestion.statement}</Markdown>
                    </Typography>
                    <div className="flex flex-col gap-3">
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
                          const buttonBgClass = isFinished
                            ? isCorrect
                              ? 'bg-green-500 hover:bg-green-500'
                              : isWrong
                                ? 'bg-red-500 hover:bg-red-500'
                                : 'bg-slate-700'
                            : isSelected
                              ? 'bg-slate-500 outline-2 outline-violet-400 outline-offset-2'
                              : 'bg-slate-700 hover:bg-slate-600'
                          const keyBadgeClass = isFinished
                            ? isCorrect
                              ? 'bg-green-600 text-white'
                              : isWrong
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-900'
                            : isSelected
                              ? 'bg-violet-400 text-white'
                              : 'bg-slate-900'
                          return (
                            <div
                              key={alt.id}
                              className="flex items-center gap-2 relative"
                            >
                              {isEliminated && (
                                <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 bg-slate-300/80 z-0" />
                              )}
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleEliminated(
                                    currentQuestion.id,
                                    alt.id,
                                    !isEliminated,
                                  )
                                }
                                disabled={isFinished}
                                aria-label={
                                  isEliminated
                                    ? 'Desfazer eliminação'
                                    : 'Eliminar alternativa'
                                }
                              >
                                <ContentCutIcon fontSize="inherit" />
                              </IconButton>
                              <button
                                type="button"
                                className={`
                                  flex gap-2 items-center justify-start w-full h-full p-3 rounded-sm text-left
                                  ${isEliminated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                  ${buttonBgClass}
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
                                <div
                                  className={`
                                    flex shrink-0 items-center justify-center min-w-8 px-2 py-1 rounded-sm text-white
                                    ${keyBadgeClass}`}
                                >
                                  {keyLabel}
                                </div>
                                <Typography variant="body1" component="span">
                                  <Markdown>{alt.text}</Markdown>
                                </Typography>
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
                <div className="p-4 flex flex-col gap-4">
                  {!isFinished && (
                    <Typography color="text.secondary">
                      As explicações ficam disponíveis após você finalizar a prova.
                    </Typography>
                  )}
                  {isFinished && currentQuestion && (
                    <>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Resposta correta:{' '}
                        {currentQuestion.correctAlternative ?? '—'}
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {currentQuestion.alternatives.map((alt, idx) => {
                          const keyLabel =
                            QUESTION_ALTERNATIVE_KEYS[idx] ?? alt.key
                          const isCorrect =
                            currentQuestion.correctAlternative === alt.key
                          const wasSelected = selectedAlternativeId === alt.id
                          const isWrong = wasSelected && !isCorrect
                          const boxSx = {
                            listStyle: 'none',
                            pl: 0,
                            p: 2,
                            borderRadius: 1,
                            border: '2px solid',
                            ...(isCorrect && {
                              bgcolor: 'success.light',
                              borderColor: 'success.main',
                            }),
                            ...(isWrong && {
                              bgcolor: 'error.light',
                              borderColor: 'error.main',
                            }),
                            ...(!isCorrect && !isWrong && {
                              bgcolor: 'action.hover',
                              borderColor: 'divider',
                            }),
                          }
                          return (
                            <Box component="li" key={alt.id} sx={boxSx}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={isCorrect ? 600 : 400}
                                  color={isCorrect ? 'success.dark' : isWrong ? 'error.dark' : 'text.primary'}
                                >
                                  {keyLabel}.
                                </Typography>
                                {isCorrect && (
                                  <Typography variant="caption" color="success.dark" fontWeight={600}>
                                    Resposta correta
                                  </Typography>
                                )}
                                {isWrong && (
                                  <Typography variant="caption" color="error.dark">
                                    Sua resposta
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                                <Markdown>{alt.text}</Markdown>
                              </Typography>
                              {alt.explanation ? (
                                <Markdown variant="body2">{alt.explanation}</Markdown>
                              ) : (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                  Sem explicação cadastrada.
                                </Typography>
                              )}
                            </Box>
                          )
                        })}
                      </Box>
                    </>
                  )}
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 2}>
                <div className="p-4">
                  <Typography color="text.secondary">
                    Statistics
                  </Typography>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 3}>
                <div className="p-4">
                  <Typography color="text.secondary">Comments</Typography>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 4}>
                <div className="p-4">
                  <Typography color="text.secondary">History</Typography>
                </div>
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 5}>
                <div className="p-4">
                  <Typography color="text.secondary">Notes</Typography>
                </div>
              </CustomTabPanel>
            </Paper>
          </div>
        </Grid>
        <Grid size={2}>
          <div className="flex flex-col gap-3 w-full">
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
                {finishAttempt.isPending
                  ? 'Finalizando prova e gerando feedback…'
                  : 'Finalizar prova'}
              </Button>
            )}
            <Grid container spacing={1} className="w-full">
              {questions.map((_, index) => (
                <Grid
                  size={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 2 }}
                  key={questions[index].id}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectQuestion(index)}
                    className={getQuestionButtonStyle(index)}
                  >
                    {index + 1}
                  </button>
                </Grid>
              ))}
            </Grid>
          </div>
        </Grid>
      </Grid>
    </div>
  )
}
