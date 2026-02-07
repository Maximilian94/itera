import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
import { QuestionEditor } from '@/components/QuestionEditor'
import {
  useExamBaseQuestionsQuery,
  useCreateExamBaseQuestionMutation,
  useParseQuestionsFromMarkdownMutation,
  useExtractFromPdfMutation,
  getApiMessage,
  type ParsedQuestionItem,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import QuestionCreator from '@/components/QuestionCreator'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import {
  useCreateExamBaseAttemptMutation,
  useExamBaseAttemptHistoryQuery,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import { ExamBaseAttemptsList } from '@/components/ExamBaseAttemptsList'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CheckCircleIcon,
  TrophyIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'
import { CalendarDaysIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { formatBRL } from '@/lib/utils'
import dayjs from 'dayjs'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/',
)({
  component: RouteComponent,
})

const QUESTIONS_TAB_INDEX = 3
const CREATE_QUESTION_TAB_INDEX = 4

function RouteComponent() {
  const { examBoard, examId } = Route.useParams()
  const [examBase, setExamBase] = useState<ExamBase | null>(null)
  const [value, setValue] = useState(0)
  const [addQuestionOpen, setAddQuestionOpen] = useState(false)
  const [addSubject, setAddSubject] = useState('')
  const [addTopic, setAddTopic] = useState('')
  const [addStatement, setAddStatement] = useState('')
  const [addReferenceText, setAddReferenceText] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [markdownText, setMarkdownText] = useState('')
  const [draftQuestions, setDraftQuestions] = useState<ParsedQuestionItem[]>([])
  const [, setRawResponseFromGrok] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const examBaseId = examId
  const { data: questions = [], isLoading, error } = useExamBaseQuestionsQuery(
    value === QUESTIONS_TAB_INDEX ? examBaseId : undefined,
  )
  const { examBases } = useExamBaseFacade({ examBoardId: examBoard })
  const navigate = useNavigate()
  const createQuestion = useCreateExamBaseQuestionMutation(examBaseId)
  const createAttempt = useCreateExamBaseAttemptMutation(examBaseId)
  const { data: attempts = [], isLoading: isLoadingAttempts, error: attemptsError } =
    useExamBaseAttemptHistoryQuery(examBaseId)
  const parseFromMarkdown = useParseQuestionsFromMarkdownMutation(examBaseId)
  const extractFromPdf = useExtractFromPdfMutation(examBaseId)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const handleStartExam = async () => {
    try {
      const attempt = await createAttempt.mutateAsync()
      await navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: { examBoard, examId, attemptId: attempt.id },
      })
    } catch {
      // Error can be shown via createAttempt.error or a toast
    }
  }

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const handleAddQuestionOpen = () => {
    setAddSubject('')
    setAddTopic('')
    setAddStatement('')
    setAddReferenceText('')
    setAddError(null)
    setAddQuestionOpen(true)
  }

  const handleAddQuestionSubmit = async () => {
    if (!addSubject.trim() || !addTopic.trim() || !addStatement.trim()) {
      setAddError('Subject, topic and statement are required.')
      return
    }
    setAddError(null)
    try {
      await createQuestion.mutateAsync({
        subject: addSubject.trim(),
        topic: addTopic.trim(),
        statement: addStatement.trim(),
        referenceText: addReferenceText.trim() || undefined,
      })
      setAddQuestionOpen(false)
    } catch (err) {
      setAddError(getApiMessage(err))
    }
  }

  const handleParseMarkdown = async () => {
    if (!markdownText.trim()) return
    setParseError(null)
    try {
      const result = await parseFromMarkdown.mutateAsync(markdownText.trim())
      setDraftQuestions(result.questions)
      setRawResponseFromGrok(result.rawResponse)
    } catch (err) {
      setParseError(getApiMessage(err))
    }
  }

  const handlePdfFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setParseError(null)
    try {
      const result = await extractFromPdf.mutateAsync(file)
      setMarkdownText(result.content)
    } catch (err) {
      setParseError(getApiMessage(err))
    }
  }

  const handleCreateDraft = async (draft: ParsedQuestionItem, index: number) => {
    setParseError(null)
    try {
      await createQuestion.mutateAsync({
        subject: draft.subject || 'Sem assunto',
        topic: draft.topic ?? '',
        statement: draft.statement,
        referenceText: draft.referenceText?.trim() || undefined,
        alternatives:
          draft.alternatives.length > 0
            ? draft.alternatives.map((a) => ({
              key: a.key,
              text: a.text,
              explanation: '',
            }))
            : undefined,
      })
      setDraftQuestions((prev) => prev.filter((_, i) => i !== index))
    } catch (err) {
      setParseError(getApiMessage(err))
    }
  }

  useEffect(() => {
    const examBase = examBases?.find((b) => b.id === examBaseId)
    setExamBase(examBase ?? null)
  }, [examBases, examBaseId])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Exame / ExameX" />

      <div className="flex flex-col gap-1">
        <div className="flex gap-4">
          <Card noElevation className="flex-1">
            <div className="flex gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/28/FGV_Nacional.png" alt="Logo" className="w-18 h-18 rounded-md" />

              <div className="flex flex-col gap-0">
                <span className="text-2xl text-slate-900">{examBase?.institution}</span>
                <span className="text-md text-slate-500">{examBase?.state ?? ''} {examBase?.city ?? ''}</span>
                <span className="text-xs text-slate-500">{examBase?.role}</span>
              </div>
            </div>
          </Card>

          <Card noElevation className="select-none">
            <div className="flex flex-col gap-0">
              <Tooltip title="Menor nota entre os aprovados da ampla concorrência [não cotista]">
                <span className="text-xs text-slate-900 hover:bg-slate-200 cursor-pointer">Nota de corte: 60%</span>
              </Tooltip>

              <div className="flex items-center space-between gap-2">
                <span className="text-3xl text-green-500 font-medium">80%</span>

                <Tooltip title="Sua nota melhorou 5% em relação à última tentativa">
                  <div className="flex items-center gap-1 bg-green-100 rounded-md p-1 h-min w-min hover:bg-green-200 cursor-pointer">
                    <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />


                    <span className="text-xs text-green-500 font-bold">5%</span>

                  </div>
                </Tooltip>
              </div>

              <span className="text-xs text-slate-500">Última nota</span>
            </div>
          </Card>

          <Card noElevation>
            <div className="flex flex-col gap-0 select-none">
              <span className="text-xs text-slate-900">Concorrência</span>

              <Tooltip title="400 candidatos inscritos para 10 vagas">
                <span className="text-3xl text-slate-700 font-medium hover:bg-slate-200 cursor-pointer">1/40</span>
              </Tooltip>


              <Tooltip title="Em média a concorrência é de 1/10">
                <span className="text-xs text-slate-500 hover:bg-slate-200 cursor-pointer">Acima da média</span>
              </Tooltip>

            </div>
          </Card>
        </div>

        <div className="flex gap-1">
          <Card noElevation className="p-0 flex items-center gap-0">
            <div className="flex items-center gap-1">
              <BanknotesIcon className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium text-slate-500">{formatBRL(examBase?.salaryBase ?? 0)}</span>
            </div>
          </Card>

          <Card noElevation className="p-0 flex items-center gap-0">
            <div className="flex items-center gap-1">
              <CalendarDaysIcon className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium text-slate-500">{ dayjs(examBase?.examDate).format('DD/MMMM/YYYY') }</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Seção Tentativas */}
      <Card noElevation className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-slate-900">Tentativas</span>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartExam}
            disabled={createAttempt.isPending}
          >
            {createAttempt.isPending ? 'Iniciando…' : 'Iniciar prova'}
          </Button>
        </div>
        {attemptsError && (
          <span className="text-sm text-red-600">Erro ao carregar tentativas.</span>
        )}
        {isLoadingAttempts && (
          <span className="text-sm text-slate-500">Carregando…</span>
        )}
        {!isLoadingAttempts && !attemptsError && attempts.length === 0 && (
          <span className="text-sm text-slate-500">
            Nenhuma tentativa ainda. Clique em &quot;Iniciar prova&quot; para começar.
          </span>
        )}
        {!isLoadingAttempts && !attemptsError && attempts.length > 0 && (
          <div className="flex flex-col gap-2">
            {attempts.map((item: ExamBaseAttemptHistoryItem) => {
              const path = item.finishedAt
                ? '/exams/$examBoard/$examId/$attemptId/feedback'
                : '/exams/$examBoard/$examId/$attemptId'
              const isClickable = item.examBoardId != null
              const status =
                item.finishedAt == null
                  ? { label: 'Em andamento', icon: ClockIcon, className: 'text-amber-600 bg-amber-50' }
                  : item.passed === true
                    ? { label: 'Aprovado', icon: CheckCircleIcon, className: 'text-green-600 bg-green-50' }
                    : { label: 'Reprovado', icon: ExclamationTriangleIcon, className: 'text-red-600 bg-red-100' }
              const StatusIcon = status.icon
              return (
                <div
                  key={item.id}
                  role={isClickable ? 'button' : undefined}
                  onClick={() =>
                    isClickable &&
                    navigate({ to: path, params: { examBoard, examId, attemptId: item.id } } as any)
                  }
                  className={`
                    flex items-center justify-between gap-4 rounded-lg border border-slate-300 p-3
                    transition-all ease-in-out duration-200
                    ${isClickable ? 'cursor-pointer hover:bg-slate-100 hover:shadow-sm active:shadow-none' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <Tooltip title={item.finishedAt ? dayjs(item.finishedAt).format('DD/MM/YYYY HH:mm') : dayjs(item.startedAt).format('DD/MM/YYYY HH:mm')}>
                      <div className="flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-700">
                          {item.finishedAt
                            ? dayjs(item.finishedAt).format('DD/MM/YYYY HH:mm')
                            : dayjs(item.startedAt).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>
                    </Tooltip>
                    <div className="flex items-center gap-1.5">
                      <TrophyIcon className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {item.percentage != null ? `${item.percentage.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* <Paper>
        <Tabs value={value} onChange={handleChange} aria-label="exam tabs">
          <Tab label="Detalhes" value={0} />
          <Tab label="Tentativas" value={1} />
          <Tab label="Estatísticas" value={2} />
          <Tab label="Questions" value={QUESTIONS_TAB_INDEX} id="questions" />
          <Tab label="Criar pergunta" value={CREATE_QUESTION_TAB_INDEX} id="create-question" />
        </Tabs>

        <CustomTabPanel value={value} hidden={value !== 0}>
          <Stack spacing={2}>
            <Typography variant="h6">Detalhes da prova</Typography>
            {examBase && (
              <Typography variant="body1">
                {examBase.name}
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartExam}
              disabled={createAttempt.isPending}
            >
              {createAttempt.isPending ? 'Iniciando…' : 'Iniciar prova'}
            </Button>
          </Stack>
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== 1}>
          <Stack spacing={2}>
            <Typography variant="h6">Suas tentativas</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartExam}
              disabled={createAttempt.isPending}
            >
              {createAttempt.isPending ? 'Iniciando…' : 'Iniciar prova'}
            </Button>
            <ExamBaseAttemptsList
              items={attempts}
              isLoading={isLoadingAttempts}
              error={attemptsError ?? null}
              emptyMessage='Nenhuma tentativa ainda. Clique em "Iniciar prova" para começar.'
              showExamBaseColumns={false}
              onRowClick={(item) => {
                const path = item.finishedAt
                  ? '/exams/$examBoard/$examId/$attemptId/feedback'
                  : '/exams/$examBoard/$examId/$attemptId'
                navigate({ to: path, params: { examBoard, examId, attemptId: item.id } } as any)
              }}
            />
          </Stack>
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== 2}>
          Estatísticas
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== QUESTIONS_TAB_INDEX}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Extrair perguntas com IA (Grok)</Typography>
            <Typography variant="body2" color="text.secondary">
              Envie um PDF para converter em markdown ou cole o texto em markdown. A IA irá identificar perguntas e alternativas.
            </Typography>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handlePdfFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => pdfInputRef.current?.click()}
              disabled={extractFromPdf.isPending}
            >
              {extractFromPdf.isPending ? 'Convertendo PDF…' : 'Enviar PDF'}
            </Button>
            <TextField
              label="Texto em Markdown"
              fullWidth
              multiline
              minRows={14}
              maxRows={30}
              value={markdownText}
              onChange={(e) => setMarkdownText(e.target.value)}
              placeholder="Cole o conteúdo da prova em markdown…"
              sx={{ fontFamily: 'monospace' }}
            />
            <Button
              variant="outlined"
              color="primary"
              onClick={handleParseMarkdown}
              disabled={parseFromMarkdown.isPending || !markdownText.trim()}
            >
              {parseFromMarkdown.isPending ? 'Extraindo…' : 'Extrair perguntas com IA'}
            </Button>
            {parseError && (
              <Alert severity="error" onClose={() => setParseError(null)}>
                {parseError}
              </Alert>
            )}

            {draftQuestions.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Perguntas em rascunho ({draftQuestions.length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revise e clique em &quot;Criar&quot; para salvar cada pergunta na base.
                </Typography>
                <Box>
                  {draftQuestions.map((draft, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body1">
                          {draft.subject}
                          {draft.topic ? ` — ${draft.topic}` : ''}
                          {draft.statement
                            ? `: ${draft.statement.slice(0, 50)}${draft.statement.length > 50 ? '…' : ''}`
                            : ''}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1}>
                          {draft.referenceText && (
                            <>
                              <Typography variant="subtitle2">Texto de referência</Typography>
                              <Markdown variant="body2">{draft.referenceText}</Markdown>
                            </>
                          )}
                          <Typography variant="subtitle2">Enunciado</Typography>
                          <Markdown variant="body2">{draft.statement}</Markdown>
                          {draft.alternatives.length > 0 && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                Alternativas
                              </Typography>
                              {draft.alternatives.map((alt, i) => (
                                <Box key={i} sx={{ display: 'flex', gap: 0.5 }}>
                                  <Typography component="span" variant="body2" fontWeight={600}>
                                    {alt.key}.
                                  </Typography>
                                  <Markdown variant="body2">{alt.text}</Markdown>
                                </Box>
                              ))}
                            </>
                          )}
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleCreateDraft(draft, index)}
                            disabled={createQuestion.isPending}
                          >
                            Criar pergunta
                          </Button>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                mt: draftQuestions.length > 0 ? 2 : 0,
              }}
            >
              <Typography variant="h6">Exam base questions</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddQuestionOpen}
                disabled={createQuestion.isPending}
              >
                Add Question
              </Button>
            </Box>

            {isLoading && (
              <Typography color="text.secondary">Loading questions…</Typography>
            )}
            {error && (
              <Alert severity="error">
                {error instanceof Error ? error.message : 'Failed to load questions'}
              </Alert>
            )}
            {!isLoading && !error && questions.length === 0 && (
              <Typography color="text.secondary">
                No questions yet. Click &quot;Add Question&quot; to create one.
              </Typography>
            )}
            {!isLoading && !error && questions.length > 0 && (
              <Box>
                {questions.map((q) => (
                  <Accordion key={q.id} elevation={3}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body1">
                        {q.subject} — {q.topic}
                        {q.statement ? `: ${q.statement.slice(0, 60)}${q.statement.length > 60 ? '…' : ''}` : ''}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {q.statementImageUrl && (
                          <Box
                            sx={{
                              maxWidth: 480,
                              maxHeight: 360,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={q.statementImageUrl}
                              alt="Enunciado"
                              style={{
                                maxWidth: '100%',
                                height: 'auto',
                                display: 'block',
                              }}
                            />
                          </Box>
                        )}
                        <QuestionEditor
                          examBaseId={examBaseId}
                          question={q}
                        />
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== CREATE_QUESTION_TAB_INDEX}>
          <QuestionCreator />
        </CustomTabPanel>
      </Paper> */}

      <Dialog open={addQuestionOpen} onClose={() => setAddQuestionOpen(false)}>
        <DialogTitle>Add question</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddError(null)}>
              {addError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
            <TextField
              label="Subject"
              size="small"
              fullWidth
              required
              value={addSubject}
              onChange={(e) => setAddSubject(e.target.value)}
            />
            <TextField
              label="Topic"
              size="small"
              fullWidth
              required
              value={addTopic}
              onChange={(e) => setAddTopic(e.target.value)}
            />
            <TextField
              label="Statement"
              size="small"
              fullWidth
              required
              multiline
              minRows={2}
              value={addStatement}
              onChange={(e) => setAddStatement(e.target.value)}
            />
            <TextField
              label="Texto de referência (opcional)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={addReferenceText}
              onChange={(e) => setAddReferenceText(e.target.value)}
              placeholder="Texto da prova ao qual a questão se refere"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddQuestionOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddQuestionSubmit}
            disabled={createQuestion.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
