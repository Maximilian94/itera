// TODO: Apenas Admin poderá ter acesso a esta página.
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { QuestionEditor } from '@/components/QuestionEditor'
import {
  useExamBaseQuestionsQuery,
  useCreateExamBaseQuestionMutation,
  useParseQuestionsFromMarkdownMutation,
  useExtractFromPdfMutation,
  useAvailableToAddQuestionsQuery,
  useAvailableSubjectsQuery,
  useCopyQuestionMutation,
  getApiMessage,
  type ParsedQuestionItem,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/Card'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/questoes',
)({
  component: QuestoesPage,
})

function QuestoesPage() {
  const { examBoard, examId } = Route.useParams()
  const examBaseId = examId
  const { examBases } = useExamBaseFacade({ examBoardId: examBoard })
  const examBase = examBases?.find((b) => b.id === examBaseId)

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

  const { data: questions = [], isLoading, error } = useExamBaseQuestionsQuery(examBaseId)
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

  const handleParseMarkdown = async () => {
    if (!markdownText.trim()) return
    setParseError(null)
    try {
      const result = await parseFromMarkdown.mutateAsync(markdownText.trim())
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/exams/$examBoard/$examId"
          params={{ examBoard, examId }}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Voltar
        </Link>
        <PageHeader
          title={examBase ? `Questões — ${examBase.institution ?? examBase.name}` : 'Questões'}
        />
      </div>

      <Card noElevation className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Questões</h2>
          <div className="flex gap-2 flex-wrap">
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
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={handleAddQuestionOpen}
              disabled={createQuestion.isPending}
            >
              Adicionar questão
            </Button>
          </div>
        </div>
        <TextField
          label="Extrair de Markdown (cole o texto e clique em Extrair)"
          fullWidth
          multiline
          minRows={4}
          maxRows={8}
          size="small"
          value={markdownText}
          onChange={(e) => setMarkdownText(e.target.value)}
          placeholder="Cole o conteúdo da prova em markdown…"
          sx={{ fontFamily: 'monospace' }}
        />
        <div className="flex gap-2">
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={handleParseMarkdown}
            disabled={parseFromMarkdown.isPending || !markdownText.trim()}
          >
            {parseFromMarkdown.isPending ? 'Extraindo…' : 'Extrair perguntas com IA'}
          </Button>
        </div>
        {parseError && (
          <Alert severity="error" onClose={() => setParseError(null)}>
            {parseError}
          </Alert>
        )}
        {draftQuestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <Typography variant="subtitle1" fontWeight={600}>
              Perguntas em rascunho ({draftQuestions.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revise e clique em &quot;Criar&quot; para salvar cada pergunta na base.
            </Typography>
            {draftQuestions.map((draft, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">
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
          </div>
        )}
        {isLoading && (
          <Typography color="text.secondary">Carregando questões…</Typography>
        )}
        {error && (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Erro ao carregar questões'}
          </Alert>
        )}
        {!isLoading && !error && questions.length === 0 && (
          <Typography color="text.secondary">
            Nenhuma questão ainda. Clique em &quot;Adicionar questão&quot; para criar ou use o campo acima
            para extrair de Markdown/PDF.
          </Typography>
        )}
        {!isLoading && !error && questions.length > 0 && (
          <div className="flex flex-col gap-2">
            <Typography variant="body2" color="text.secondary">
              {questions.length} questão(ões)
            </Typography>
            {questions.map((q) => (
              <Accordion key={q.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">
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
                          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        />
                      </Box>
                    )}
                    <QuestionEditor examBaseId={examBaseId} question={q} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        )}
      </Card>

      <Card noElevation className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Adicionar questões existentes
        </h2>
        <p className="text-sm text-slate-600">
          Escolha uma matéria para filtrar e adicione questões de outros concursos.
        </p>
        <FormControl size="small" className="min-w-[200px]" fullWidth>
          <InputLabel id="add-existing-subject-label">Matéria</InputLabel>
          <Select
            labelId="add-existing-subject-label"
            label="Matéria"
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
          <Typography color="text.secondary">Carregando questões…</Typography>
        ) : availableQuestions.length === 0 ? (
          <Typography color="text.secondary">
            Nenhuma questão disponível em outros concursos.
          </Typography>
        ) : (
          <div className="flex flex-col gap-2">
            <Typography variant="body2" color="text.secondary">
              {availableQuestions.length} questão(ões) encontrada(s)
            </Typography>
            {availableQuestions.map((q) => (
              <div
                key={`${q.examBaseId}-${q.id}`}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Typography variant="body2" fontWeight={600}>
                      {q.subject ?? 'Sem matéria'} — {q.topic ?? ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {q.statement.slice(0, 120)}
                      {q.statement.length > 120 ? '…' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      De: {q.examBase?.institution ?? q.examBase?.name ?? 'Outro concurso'}
                    </Typography>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      copyQuestion.mutate({
                        sourceExamBaseId: q.examBaseId,
                        sourceQuestionId: q.id,
                      })
                    }
                    disabled={copyQuestion.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={addQuestionOpen} onClose={() => setAddQuestionOpen(false)}>
        <DialogTitle>Adicionar questão</DialogTitle>
        <DialogContent>
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddError(null)}>
              {addError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
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
            <TextField
              label="Enunciado"
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
          <Button onClick={() => setAddQuestionOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddQuestionSubmit}
            disabled={createQuestion.isPending}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
