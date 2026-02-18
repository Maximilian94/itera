import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import {
  useCreateExamBaseQuestionMutation,
  useParseQuestionsFromMarkdownMutation,
  useExtractFromPdfMutation,
  useAvailableToAddQuestionsQuery,
  useAvailableSubjectsQuery,
  useCopyQuestionMutation,
  getApiMessage,
  type ParsedQuestionItem,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { Card } from '@/components/Card'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  SparklesIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/questoes-v2',
)({
  component: QuestoesV2Page,
})

function QuestoesV2Page() {
  const { examBoard, examId } = Route.useParams()
  const navigate = useNavigate()
  const examBaseId = examId

  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [selectedAddMethod, setSelectedAddMethod] = useState<'manual' | 'ai' | 'existing' | null>(null)
  const [addQuestionOpen, setAddQuestionOpen] = useState(false)
  const [addSubject, setAddSubject] = useState('')
  const [addTopic, setAddTopic] = useState('')
  const [addStatement, setAddStatement] = useState('')
  const [addReferenceText, setAddReferenceText] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [markdownText, setMarkdownText] = useState('')
  const [draftQuestions, setDraftQuestions] = useState<ParsedQuestionItem[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [addExistingSubject, setAddExistingSubject] = useState<string>('')

  const { data: availableSubjects = [] } = useAvailableSubjectsQuery(examBaseId)
  const { data: availableQuestions = [], isLoading: loadingAvailable } =
    useAvailableToAddQuestionsQuery(
      examBaseId,
      addExistingSubject ? addExistingSubject : undefined,
    )
  const copyQuestion = useCopyQuestionMutation(examBaseId)
  const createQuestion = useCreateExamBaseQuestionMutation(examBaseId)
  const parseFromMarkdown = useParseQuestionsFromMarkdownMutation(examBaseId)
  const extractFromPdf = useExtractFromPdfMutation(examBaseId)
  const pdfInputRef = useRef<HTMLInputElement>(null)

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
      setAddError('Matéria, tópico e enunciado são obrigatórios.')
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

  const handleParseMarkdown = async (provider: 'grok' | 'chatgpt') => {
    if (!markdownText.trim()) return
    setParseError(null)
    try {
      const result = await parseFromMarkdown.mutateAsync({
        markdown: markdownText.trim(),
        provider,
      })
      setDraftQuestions(result.questions)
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

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          to="/exams/$examBoard/$examId"
          params={{ examBoard, examId }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors no-underline"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <DocumentTextIcon className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gerenciar questões v2
          </h1>
          <p className="text-sm text-slate-500">
            Visualização em formato de player
          </p>
        </div>
      </div>

      {/* Player em modo management */}
      <ExamAttemptPlayer
        examBaseId={examBaseId}
        managementMode={true}
        onAddQuestion={() => setAddPanelOpen(true)}
        onBack={() =>
          navigate({
            to: '/exams/$examBoard/$examId',
            params: { examBoard, examId },
          })
        }
      />

      {/* Panel inline para adicionar questão */}
      {addPanelOpen && (
        <Card noElevation className="border border-violet-200 bg-violet-50/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Adicionar questão
            </h3>
            <button
              type="button"
              onClick={() => {
                setAddPanelOpen(false)
                setSelectedAddMethod(null)
              }}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Grid com 3 opções */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Opção 1: Manual */}
            <button
              type="button"
              onClick={() => setSelectedAddMethod(selectedAddMethod === 'manual' ? null : 'manual')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                selectedAddMethod === 'manual'
                  ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedAddMethod === 'manual' ? 'bg-violet-100' : 'bg-slate-100'
                }`}>
                  <PencilSquareIcon className={`w-6 h-6 ${
                    selectedAddMethod === 'manual' ? 'text-violet-600' : 'text-slate-600'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${
                    selectedAddMethod === 'manual' ? 'text-violet-900' : 'text-slate-800'
                  }`}>
                    Manualmente
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Crie questões preenchendo campos de forma manual
                  </p>
                </div>
              </div>
            </button>

            {/* Opção 2: Por IA */}
            <button
              type="button"
              onClick={() => setSelectedAddMethod(selectedAddMethod === 'ai' ? null : 'ai')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                selectedAddMethod === 'ai'
                  ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedAddMethod === 'ai' ? 'bg-violet-100' : 'bg-slate-100'
                }`}>
                  <SparklesIcon className={`w-6 h-6 ${
                    selectedAddMethod === 'ai' ? 'text-violet-600' : 'text-slate-600'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${
                    selectedAddMethod === 'ai' ? 'text-violet-900' : 'text-slate-800'
                  }`}>
                    Por IA
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Extraia questões de Markdown ou PDF com IA
                  </p>
                </div>
              </div>
            </button>

            {/* Opção 3: Questões existentes */}
            <button
              type="button"
              onClick={() => setSelectedAddMethod(selectedAddMethod === 'existing' ? null : 'existing')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                selectedAddMethod === 'existing'
                  ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedAddMethod === 'existing' ? 'bg-violet-100' : 'bg-slate-100'
                }`}>
                  <ArrowPathIcon className={`w-6 h-6 ${
                    selectedAddMethod === 'existing' ? 'text-violet-600' : 'text-slate-600'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${
                    selectedAddMethod === 'existing' ? 'text-violet-900' : 'text-slate-800'
                  }`}>
                    Questão já existente
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Adicione questões de outros concursos
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Conteúdo expandido baseado na seleção */}
          {selectedAddMethod === 'manual' && (
            <Card noElevation className="border border-violet-200 bg-violet-50/30 p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Criar questão manualmente
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preencha os campos para adicionar uma nova questão
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddQuestionOpen}
                    disabled={createQuestion.isPending}
                  >
                    Nova questão
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {selectedAddMethod === 'ai' && (
            <Card noElevation className="border border-violet-200 bg-violet-50/30 p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Extrair questões com IA
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Envie um PDF ou cole texto em Markdown para extrair questões automaticamente
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handlePdfFileChange}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadFileIcon />}
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={extractFromPdf.isPending}
                  >
                    {extractFromPdf.isPending ? 'Convertendo PDF…' : 'Enviar PDF'}
                  </Button>
                </div>

                <TextField
                  label="Texto em Markdown"
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={8}
                  size="small"
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  placeholder="Cole o conteúdo da prova em markdown…"
                  sx={{ fontFamily: 'monospace', bgcolor: 'white' }}
                />

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleParseMarkdown('chatgpt')}
                    disabled={parseFromMarkdown.isPending || !markdownText.trim()}
                    startIcon={<SparklesIcon className="w-4 h-4" />}
                  >
                    {parseFromMarkdown.isPending
                      ? 'Extraindo…'
                      : 'Extrair perguntas com ChatGPT'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleParseMarkdown('grok')}
                    disabled={parseFromMarkdown.isPending || !markdownText.trim()}
                    startIcon={<SparklesIcon className="w-4 h-4" />}
                  >
                    {parseFromMarkdown.isPending
                      ? 'Extraindo…'
                      : 'Extrair perguntas com Grok'}
                  </Button>
                </div>

                {parseError && (
                  <Alert severity="error" onClose={() => setParseError(null)}>
                    {parseError}
                  </Alert>
                )}

                {draftQuestions.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2">
                    <div>
                      <Typography variant="subtitle2" fontWeight={600} className="text-slate-800">
                        Perguntas em rascunho ({draftQuestions.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" className="text-xs">
                        Revise e clique em &quot;Criar&quot; para salvar cada pergunta
                      </Typography>
                    </div>
                    {draftQuestions.map((draft, index) => (
                      <Accordion
                        key={index}
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          bgcolor: 'white',
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" className="text-slate-700">
                            {draft.subject}
                            {draft.topic ? ` — ${draft.topic}` : ''}
                            {draft.statement
                              ? `: ${draft.statement.slice(0, 50)}${draft.statement.length > 50 ? '…' : ''}`
                              : ''}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={2}>
                            {draft.referenceText && (
                              <>
                                <Typography variant="subtitle2" className="text-slate-700">
                                  Texto de referência
                                </Typography>
                                <Markdown variant="body2">{draft.referenceText}</Markdown>
                              </>
                            )}
                            <Typography variant="subtitle2" className="text-slate-700">
                              Enunciado
                            </Typography>
                            <Markdown variant="body2">{draft.statement}</Markdown>
                            {draft.alternatives.length > 0 && (
                              <>
                                <Typography variant="subtitle2" className="text-slate-700">
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
                            <div>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleCreateDraft(draft, index)}
                                disabled={createQuestion.isPending}
                              >
                                Criar pergunta
                              </Button>
                            </div>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {selectedAddMethod === 'existing' && (
            <Card noElevation className="border border-violet-200 bg-violet-50/30 p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Adicionar de outros concursos
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escolha uma matéria e adicione questões já cadastradas em outros exames
                  </p>
                </div>

                <FormControl size="small" sx={{ maxWidth: 300, bgcolor: 'white' }}>
                  <InputLabel id="add-existing-subject-label">Filtrar por matéria</InputLabel>
                  <Select
                    labelId="add-existing-subject-label"
                    label="Filtrar por matéria"
                    value={addExistingSubject}
                    onChange={(e) => setAddExistingSubject(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Todas as matérias</em>
                    </MenuItem>
                    {availableSubjects.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {loadingAvailable ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse text-slate-400 text-sm">
                      Carregando questões…
                    </div>
                  </div>
                ) : availableQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg bg-white border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 text-center">
                      Nenhuma questão disponível{addExistingSubject ? ' para esta matéria' : ''}.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-600 font-medium">
                      {availableQuestions.length} questão{availableQuestions.length !== 1 ? 'ões' : ''} encontrada{availableQuestions.length !== 1 ? 's' : ''}
                    </p>
                    {availableQuestions.map((q) => (
                      <div
                        key={`${q.examBaseId}-${q.id}`}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Typography variant="body2" fontWeight={600} className="text-slate-800">
                              {q.subject ?? 'Sem matéria'} — {q.topic ?? ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" className="mt-1">
                              {q.statement.slice(0, 150)}
                              {q.statement.length > 150 ? '…' : ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="mt-1 inline-block">
                              De: {q.examBase?.institution ?? q.examBase?.name ?? 'Outro concurso'}
                            </Typography>
                          </div>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() =>
                              copyQuestion.mutate({
                                sourceExamBaseId: q.examBaseId,
                                sourceQuestionId: q.id,
                              })
                            }
                            disabled={copyQuestion.isPending}
                            sx={{ shrink: 0 }}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </Card>
      )}

      {/* Dialog: Adicionar questão manualmente */}
      <Dialog
        open={addQuestionOpen}
        onClose={() => setAddQuestionOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adicionar questão</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddError(null)}>
              {addError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Matéria"
              size="small"
              fullWidth
              required
              value={addSubject}
              onChange={(e) => setAddSubject(e.target.value)}
            />
            <TextField
              label="Tópico"
              size="small"
              fullWidth
              required
              value={addTopic}
              onChange={(e) => setAddTopic(e.target.value)}
            />
            <MarkdownEditor
              label="Enunciado"
              value={addStatement}
              onChange={setAddStatement}
              minHeight={400}
            />
            <MarkdownEditor
              label="Texto de referência (opcional)"
              value={addReferenceText}
              onChange={setAddReferenceText}
              minHeight={400}
              placeholder="Texto da prova ao qual a questão se refere"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddQuestionOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddQuestionSubmit}
            disabled={createQuestion.isPending}
          >
            {createQuestion.isPending ? 'Criando…' : 'Criar questão'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
