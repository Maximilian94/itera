import {
  useCreateExamBoardMutation,
  useExamBoardQueries,
} from '@/features/examBoard/queries/examBoard.queries'
import {
  useExamBaseQuery,
  useExtractExamMetadataMutation,
  useUpdateExamBaseMutation,
} from '@/features/examBase/queries/examBase.queries'
import type { ExtractedExamMetadata, ProcessingPhase } from '@/features/examBase/domain/examBase.types'
import {
  useCreateBatchQuestionsMutation,
  type ParsedQuestionStructure,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'

import { StateCitySelect } from '@/components/StateCitySelect'
import { Markdown } from '@/components/Markdown'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ImageIcon from '@mui/icons-material/Image'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  LinearProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/_authenticated/exams/editar/$examBaseId')({
  component: ExamEditPage,
})

type GovernmentScope = 'MUNICIPAL' | 'STATE' | 'FEDERAL'

type FormState = {
  name: string
  role: string
  institution: string
  governmentScope: GovernmentScope
  state: string
  city: string
  examDate: string
  salaryBase: string
  minPassingGradeNonQuota: string
  examBoardId: string
}

const EMPTY_FORM: FormState = {
  name: '',
  role: '',
  institution: '',
  governmentScope: 'FEDERAL',
  state: '',
  city: '',
  examDate: '',
  salaryBase: '',
  minPassingGradeNonQuota: '',
  examBoardId: '',
}

const NEW_BOARD_SENTINEL = '__new__'

function applyExtracted(prev: FormState, data: ExtractedExamMetadata): FormState {
  return {
    name: data.name ?? prev.name,
    role: data.role ?? prev.role,
    institution: data.institution ?? prev.institution,
    governmentScope: data.governmentScope ?? prev.governmentScope,
    state: data.state ?? prev.state,
    city: data.city ?? prev.city,
    examDate: data.examDate ? data.examDate.slice(0, 10) : prev.examDate,
    salaryBase: data.salaryBase ?? prev.salaryBase,
    minPassingGradeNonQuota: data.minPassingGradeNonQuota ?? prev.minPassingGradeNonQuota,
    examBoardId: prev.examBoardId,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Edital', 'Prova', 'Gabarito', 'Revisão', 'Explicações']

const PHASE_TO_STEP: Record<ProcessingPhase, number> = {
  EDITAL: 1,
  PROVA: 2,
  GABARITO: 3,
  REVISAO: 4,
  EXPLICACOES: 5,
  CONCLUIDO: 5,
}

const STEP_TO_PHASE: Record<number, ProcessingPhase> = {
  1: 'EDITAL',
  2: 'PROVA',
  3: 'GABARITO',
  4: 'REVISAO',
  5: 'EXPLICACOES',
}


function StepIndicator({ step, onStepClick }: { step: number; onStepClick?: (step: number) => void }) {
  return (
    <div className="flex items-center gap-1 mb-6 flex-wrap">
      {WIZARD_STEPS.map((label, i) => {
        const idx = i + 1
        const active = step === idx
        const done = step > idx
        const clickable = done && onStepClick
        return (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                ${active ? 'bg-violet-600 text-white' : done ? 'bg-violet-200 text-violet-700' : 'bg-slate-200 text-slate-500'}
                ${clickable ? 'cursor-pointer hover:bg-violet-300' : ''}`}
              onClick={() => clickable && onStepClick(idx)}
            >
              {idx}
            </div>
            <span
              className={`text-sm font-medium ${active ? 'text-violet-700' : 'text-slate-500'}
                ${clickable ? 'cursor-pointer hover:text-violet-700' : ''}`}
              onClick={() => clickable && onStepClick(idx)}
            >
              {label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="w-6 h-px bg-slate-300 mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline ExamBoard creation form
// ─────────────────────────────────────────────────────────────────────────────

function NewExamBoardForm({
  onCreated,
  onCancel,
  suggestedName,
  suggestedAlias,
}: {
  onCreated: (id: string) => void
  onCancel: () => void
  suggestedName?: string | null
  suggestedAlias?: string | null
}) {
  const [name, setName] = useState(suggestedName ?? '')
  const [alias, setAlias] = useState(suggestedAlias ?? '')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const createBoard = useCreateExamBoardMutation()

  async function handleCreate() {
    if (!name.trim()) return
    const board = await createBoard.mutateAsync({
      name: name.trim(),
      alias: alias.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
    })
    onCreated(board.id)
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'violet.200',
        borderRadius: 2,
        p: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Typography variant="body2" fontWeight={600} mb={1.5} color="text.secondary">
        Nova banca
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          label="Nome da banca *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Sigla (ex: FCC)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Site (opcional)"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          size="small"
          fullWidth
        />
        {createBoard.isError && (
          <Alert severity="error" sx={{ py: 0 }}>
            {(createBoard.error as Error)?.message ?? 'Erro ao criar banca'}
          </Alert>
        )}
        <div className="flex gap-2 justify-end">
          <Button size="small" onClick={onCancel} disabled={createBoard.isPending}>
            Cancelar
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || createBoard.isPending}
            startIcon={createBoard.isPending ? <CircularProgress size={14} /> : undefined}
          >
            Criar banca
          </Button>
        </div>
      </Stack>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Metadata
// ─────────────────────────────────────────────────────────────────────────────

function MetadataStep({
  examBaseId,
  onNext,
}: {
  examBaseId: string
  onNext: () => void
}) {
  const { data: examBase } = useExamBaseQuery(examBaseId)
  const { data: examBoards = [] } = useExamBoardQueries()
  const extractMutation = useExtractExamMetadataMutation()
  const updateMutation = useUpdateExamBaseMutation(examBaseId)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [showNewBoardForm, setShowNewBoardForm] = useState(false)
  const [extractedBoardName, setExtractedBoardName] = useState<string | null>(null)
  const [extractedBoardAlias, setExtractedBoardAlias] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form from loaded examBase (in case of page refresh)
  useEffect(() => {
    if (!examBase) return
    setForm({
      name: examBase.name ?? '',
      role: examBase.role ?? '',
      institution: examBase.institution ?? '',
      governmentScope: examBase.governmentScope ?? 'FEDERAL',
      state: examBase.state ?? '',
      city: examBase.city ?? '',
      examDate: examBase.examDate ? examBase.examDate.slice(0, 10) : '',
      salaryBase: examBase.salaryBase ?? '',
      minPassingGradeNonQuota: examBase.minPassingGradeNonQuota ?? '',
      examBoardId: examBase.examBoardId ?? '',
    })
  }, [examBase])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleExtract() {
    if (!pdfFile) return
    const data = await extractMutation.mutateAsync({
      role: form.role.trim() || undefined,
      pdfFile,
    })
    setForm((prev) => applyExtracted(prev, data))
    if (data.examBoardName) {
      setExtractedBoardName(data.examBoardName)
      if (data.examBoardAlias) setExtractedBoardAlias(data.examBoardAlias)
      const match = examBoards.find(
        (b) =>
          b.name.toLowerCase() === data.examBoardName!.toLowerCase() ||
          (data.examBoardAlias && b.alias?.toLowerCase() === data.examBoardAlias.toLowerCase()),
      )
      if (match) {
        set('examBoardId', match.id)
      } else {
        setShowNewBoardForm(true)
      }
    }
  }

  async function handleNext() {
    await updateMutation.mutateAsync({
      name: form.name || undefined,
      role: form.role || undefined,
      institution: form.institution || null,
      governmentScope: form.governmentScope,
      state: form.state || null,
      city: form.city || null,
      examDate: form.examDate || undefined,
      salaryBase: form.salaryBase || null,
      minPassingGradeNonQuota: form.minPassingGradeNonQuota || null,
      examBoardId: form.examBoardId || null,
    })
    onNext()
  }

  const canAdvance = form.name.trim() !== '' && form.role.trim() !== '' && form.examDate.trim() !== ''
  const canExtract = pdfFile != null && !extractMutation.isPending

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: AI extraction panel */}
      <div className="flex flex-col gap-4">
        <div>
          <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
            Extrair com IA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Faça upload do PDF do edital. A IA preencherá os campos automaticamente.
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            size="small"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            {pdfFile ? pdfFile.name : 'Upload PDF'}
          </Button>
          {pdfFile && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700 underline"
              onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
            >
              Remover
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Button
          variant="contained"
          startIcon={extractMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!canExtract}
          onClick={handleExtract}
          sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' }, alignSelf: 'flex-start' }}
        >
          {extractMutation.isPending ? 'Extraindo...' : 'Extrair metadados'}
        </Button>

        {extractMutation.isError && (
          <Alert severity="error">
            {(extractMutation.error as Error)?.message ?? 'Erro ao extrair metadados'}
          </Alert>
        )}

        {extractMutation.isSuccess && (
          <Alert severity="success" sx={{ py: 0.5 }}>
            Metadados extraídos! Revise os campos ao lado.
          </Alert>
        )}
      </div>

      {/* Right: Form */}
      <Stack spacing={2}>
        <TextField
          label="Nome do concurso *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Cargo *"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Instituição / Órgão"
          value={form.institution}
          onChange={(e) => set('institution', e.target.value)}
          fullWidth
          size="small"
        />
        <FormControl fullWidth size="small">
          <InputLabel id="scope-label">Âmbito *</InputLabel>
          <Select
            labelId="scope-label"
            value={form.governmentScope}
            label="Âmbito *"
            onChange={(e) => set('governmentScope', e.target.value as GovernmentScope)}
          >
            <MenuItem value="MUNICIPAL">Municipal</MenuItem>
            <MenuItem value="STATE">Estadual</MenuItem>
            <MenuItem value="FEDERAL">Federal</MenuItem>
          </Select>
        </FormControl>

        <StateCitySelect
          governmentScope={form.governmentScope}
          state={form.state}
          city={form.city}
          onStateChange={(v) => set('state', v ?? '')}
          onCityChange={(v) => set('city', v ?? '')}
          fullWidth
        />

        <TextField
          label="Data do exame *"
          type="date"
          value={form.examDate}
          onChange={(e) => set('examDate', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />
        <TextField
          label="Salário base (R$)"
          type="number"
          value={form.salaryBase}
          onChange={(e) => set('salaryBase', e.target.value)}
          inputProps={{ step: '0.01', min: 0 }}
          fullWidth
          size="small"
        />
        <TextField
          label="Nota mínima de aprovação (%)"
          type="number"
          value={form.minPassingGradeNonQuota}
          onChange={(e) => set('minPassingGradeNonQuota', e.target.value)}
          inputProps={{ step: '0.01', min: 0, max: 100 }}
          fullWidth
          size="small"
        />
        <Divider />

        {/* Exam board select */}
        <FormControl fullWidth size="small">
          <InputLabel id="board-label">Banca</InputLabel>
          <Select
            labelId="board-label"
            value={showNewBoardForm ? NEW_BOARD_SENTINEL : (form.examBoardId || '')}
            label="Banca"
            onChange={(e) => {
              if (e.target.value === NEW_BOARD_SENTINEL) {
                setShowNewBoardForm(true)
              } else {
                set('examBoardId', e.target.value)
                setShowNewBoardForm(false)
              }
            }}
          >
            <MenuItem value="">Nenhuma</MenuItem>
            {examBoards.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                <Tooltip title={b.name} placement="right">
                  <span>{b.alias ?? b.name}</span>
                </Tooltip>
              </MenuItem>
            ))}
            <MenuItem value={NEW_BOARD_SENTINEL}>
              <span className="text-violet-600 font-medium">+ Adicionar nova banca</span>
            </MenuItem>
          </Select>
        </FormControl>

        {showNewBoardForm && (
          <NewExamBoardForm
            suggestedName={extractedBoardName}
            suggestedAlias={extractedBoardAlias}
            onCreated={(id) => {
              set('examBoardId', id)
              setShowNewBoardForm(false)
            }}
            onCancel={() => setShowNewBoardForm(false)}
          />
        )}

        {updateMutation.isError && (
          <Alert severity="error">
            {(updateMutation.error as Error)?.message ?? 'Erro ao salvar'}
          </Alert>
        )}

        {!canAdvance && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Preencha os campos obrigatórios (*) para avançar.
          </Alert>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canAdvance || updateMutation.isPending}
            startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
          >
            Próximo: Prova
          </Button>
        </div>
      </Stack>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Questions (placeholder)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

type ReviewQuestion = ParsedQuestionStructure & {
  correctAlternative: string | null
  answerDoubt: boolean
  doubtReason: string | null
  explanations: { key: string; explanation: string }[]
  unblocked: boolean
  statementImageUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Questions
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Shared progress bar
// ─────────────────────────────────────────────────────────────────────────────

function StepProgressBar({
  label,
  value,
  color = 'primary',
}: {
  label: string
  /** Pass -1 to show an indeterminate bar (no % label). */
  value: number
  color?: 'primary' | 'success' | 'error'
}) {
  const indeterminate = value < 0
  return (
    <Box sx={{ mt: 2 }}>
      <div className="flex items-center justify-between mb-1">
        <Typography variant="caption" color={color === 'error' ? 'error.main' : 'text.secondary'}>
          {label}
        </Typography>
        {color !== 'error' && !indeterminate && (
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {value}%
          </Typography>
        )}
      </div>
      <LinearProgress
        variant={indeterminate ? 'indeterminate' : 'determinate'}
        value={indeterminate ? undefined : value}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Prova PDF → GPT-4o extracts questions
// ─────────────────────────────────────────────────────────────────────────────

function ExamPdfStep({
  examBaseId,
  onNext,
  onBack,
}: {
  examBaseId: string
  onNext: (questions: ParsedQuestionStructure[]) => void
  onBack: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [questions, setQuestions] = useState<ParsedQuestionStructure[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleParse() {
    if (!file) return
    setStatus('parsing')
    setErrorMsg(null)
    setQuestions([])

    try {
      const { questions: all } = await examBaseQuestionsService.parseQuestionsFromPdf(examBaseId, file)
      setQuestions(all)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg((err as Error).message ?? 'Erro ao extrair questões da prova')
    }
  }

  const isParsing = status === 'parsing'
  const blockedCount = questions.filter((q) => q.hasImage).length

  return (
    <div className="flex flex-col gap-6">
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Prova (PDF)
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Envie o PDF da prova. Mistral OCR extrairá o conteúdo e GPT-4.1-mini estruturará as questões.
        </Typography>

        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outlined"
            size="small"
            disabled={isParsing}
            onClick={() => fileRef.current?.click()}
          >
            {file ? file.name : 'Selecionar PDF'}
          </Button>
          {file && !isParsing && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700 underline"
              onClick={() => { setFile(null); setQuestions([]); setStatus('idle'); if (fileRef.current) fileRef.current.value = '' }}
            >
              Remover
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setQuestions([]); setStatus('idle') } }}
        />

        {status === 'idle' && (
          <Button variant="contained" startIcon={<AutoAwesomeIcon />} disabled={!file} onClick={handleParse}
            sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}>
            Extrair questões
          </Button>
        )}

        {isParsing && (
          <>
            <StepProgressBar label="Extraindo questões (Claude Sonnet 4.6)..." value={-1} />
            <Button variant="contained" startIcon={<CircularProgress size={16} color="inherit" />} disabled sx={{ mt: 2, bgcolor: 'violet.600' }}>
              Extraindo...
            </Button>
          </>
        )}

        {status === 'done' && (
          <>
            <StepProgressBar label={`${questions.length} questões extraídas!`} value={100} color="success" />
            {blockedCount > 0 && (
              <Alert severity="warning" sx={{ mt: 2, py: 0.5 }}>
                {blockedCount} questão(ões) referenciam imagens. Será necessário fazer upload antes de salvar.
              </Alert>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            {errorMsg && <Alert severity="error" sx={{ mt: 1 }}>{errorMsg}</Alert>}
            <Button variant="outlined" onClick={() => setStatus('idle')} sx={{ mt: 2 }}>
              Tentar novamente
            </Button>
          </>
        )}
      </Box>

      {/* Preview das questões extraídas */}
      {questions.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Questões extraídas ({questions.length})
          </Typography>
          <Stack spacing={1.5} sx={{ maxHeight: 400, overflow: 'auto' }}>
            {questions.map((q) => (
              <Box
                key={q.number}
                sx={{
                  border: '1px solid',
                  borderColor: q.hasImage ? 'warning.light' : 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: q.hasImage ? 'warning.50' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Typography variant="body2" fontWeight={700}>
                    {q.number}.
                  </Typography>
                  {q.subject && <Chip label={q.subject} size="small" variant="outlined" />}
                  {q.hasImage && (
                    <Chip icon={<ImageIcon fontSize="small" />} label="Imagem" size="small" color="warning" variant="outlined" />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {q.alternatives.length} alternativas
                  </Typography>
                </div>
                <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.statement.slice(0, 150)}{q.statement.length > 150 ? '...' : ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />} disabled={isParsing}>
          Voltar
        </Button>
        <Button
          variant="contained"
          disabled={status !== 'done' || questions.length === 0}
          onClick={() => onNext(questions)}
          sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
        >
          Próximo: Gabarito
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Gabarito (Claude Haiku)
// ─────────────────────────────────────────────────────────────────────────────

function GabaritoStep({
  examBaseId,
  structuredQuestions,
  onNext,
  onBack,
}: {
  examBaseId: string
  structuredQuestions: ParsedQuestionStructure[]
  onNext: (answerKey: Record<string, string>) => void
  onBack: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [cargo, setCargo] = useState('Enfermeiro')
  const [status, setStatus] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle')
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExtract() {
    if (!file) return
    setStatus('extracting')
    setErrorMsg(null)
    try {
      const { answerKey: key } = await examBaseQuestionsService.extractGabaritoAnswerKey(
        examBaseId,
        file,
        cargo.trim() || undefined,
      )
      setAnswerKey(key)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg((err as Error).message ?? 'Erro ao extrair gabarito')
    }
  }

  function handleAnswerChange(questionNumber: string, value: string) {
    setAnswerKey((prev) => ({ ...prev, [questionNumber]: value.toUpperCase() }))
  }

  // Validation: compare gabarito vs extracted questions
  const questionNumbers = structuredQuestions.map((q) => String(q.number))
  const gabaritoNumbers = Object.keys(answerKey)
  const matched = questionNumbers.filter((n) => gabaritoNumbers.includes(n))
  const missingInGabarito = questionNumbers.filter((n) => !gabaritoNumbers.includes(n))
  const extraInGabarito = gabaritoNumbers.filter((n) => !questionNumbers.includes(n))
  const answerCount = gabaritoNumbers.length

  return (
    <div className="flex flex-col gap-6">
      {/* Upload section */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Gabarito (Claude Haiku)
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Envie o PDF do gabarito. Claude Haiku extrai o mapa de respostas corretas por número de questão.
        </Typography>

        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outlined"
            size="small"
            disabled={status === 'extracting'}
            onClick={() => fileRef.current?.click()}
          >
            {file ? file.name : 'Selecionar PDF do gabarito'}
          </Button>
          {file && status !== 'extracting' && (
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700 underline"
              onClick={() => {
                setFile(null)
                setStatus('idle')
                setAnswerKey({})
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              Remover
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { setFile(f); setStatus('idle'); setAnswerKey({}) }
          }}
        />

        <Box sx={{ maxWidth: 320, mb: 2 }}>
          <TextField
            label="Cargo no gabarito"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            size="small"
            fullWidth
            disabled={status === 'extracting'}
            helperText="Nome do cargo para filtrar a seção correta"
          />
        </Box>

        {status === 'idle' && (
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            disabled={!file}
            onClick={handleExtract}
            sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
          >
            Extrair gabarito
          </Button>
        )}

        {status === 'extracting' && (
          <>
            <StepProgressBar label="Extraindo gabarito (Claude Haiku)..." value={-1} />
            <Button variant="contained" startIcon={<CircularProgress size={16} color="inherit" />} disabled sx={{ mt: 2, bgcolor: 'violet.600' }}>
              Extraindo...
            </Button>
          </>
        )}

        {status === 'done' && (
          <StepProgressBar label={`${answerCount} respostas extraídas!`} value={100} color="success" />
        )}

        {status === 'error' && (
          <>
            {errorMsg && <Alert severity="error" sx={{ mt: 1 }}>{errorMsg}</Alert>}
            <Button variant="outlined" onClick={() => setStatus('idle')} sx={{ mt: 2 }}>
              Tentar novamente
            </Button>
          </>
        )}
      </Box>

      {/* Validation & editable answer key table */}
      {status === 'done' && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
            Validação do gabarito
          </Typography>

          {/* Validation summary */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <Chip
              icon={<CheckCircleIcon fontSize="small" />}
              label={`${matched.length} questões com gabarito`}
              size="small"
              color="success"
              variant="outlined"
            />
            {missingInGabarito.length > 0 && (
              <Chip
                icon={<ErrorOutlineIcon fontSize="small" />}
                label={`${missingInGabarito.length} sem gabarito`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
            {extraInGabarito.length > 0 && (
              <Chip
                icon={<WarningAmberIcon fontSize="small" />}
                label={`${extraInGabarito.length} extras no gabarito`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </div>

          {missingInGabarito.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
              Questões sem gabarito: {missingInGabarito.join(', ')}. Você pode preencher manualmente abaixo.
            </Alert>
          )}

          {extraInGabarito.length > 0 && (
            <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
              O gabarito contém questões que não estão na prova: {extraInGabarito.join(', ')}. Serão ignoradas.
            </Alert>
          )}

          {/* Editable answer key grid */}
          <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {questionNumbers.map((num) => {
                const answer = answerKey[num] ?? ''
                const isMissing = !answer
                return (
                  <div
                    key={num}
                    className="flex items-center gap-1 px-2 py-1 rounded"
                    style={{
                      border: `1px solid ${isMissing ? '#ef5350' : '#e0e0e0'}`,
                      backgroundColor: isMissing ? '#fff3f3' : 'transparent',
                    }}
                  >
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 28 }}>
                      {num}.
                    </Typography>
                    <TextField
                      value={answer}
                      onChange={(e) => handleAnswerChange(num, e.target.value.slice(0, 1))}
                      size="small"
                      variant="standard"
                      inputProps={{
                        maxLength: 1,
                        style: { textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', width: 24, padding: '2px 0' },
                      }}
                      sx={{ '& .MuiInput-underline:before': { borderBottom: 'none' } }}
                    />
                  </div>
                )
              })}
            </div>
          </Box>
        </Box>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Voltar
        </Button>
        <Button
          variant="contained"
          disabled={status !== 'done' || matched.length === 0}
          onClick={() => onNext(answerKey)}
          sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
        >
          Próximo: Revisão
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Revisão (Human QC)
// ─────────────────────────────────────────────────────────────────────────────

function ReviewStep({
  examBaseId,
  structuredQuestions,
  answerKey,
  onNext,
  onBack,
}: {
  examBaseId: string
  structuredQuestions: ParsedQuestionStructure[]
  answerKey: Record<string, string>
  onNext: (reviewed: ReviewQuestion[]) => void
  onBack: () => void
}) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>(() =>
    structuredQuestions.map((q) => ({
      ...q,
      correctAlternative: answerKey[String(q.number)] ?? null,
      answerDoubt: false,
      doubtReason: null,
      explanations: [],
      unblocked: false,
    }))
  )
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const withAnswer = questions.filter((q) => q.correctAlternative)
  const withoutAnswer = questions.filter((q) => !q.correctAlternative)
  const needsImage = questions.filter((q) => q.hasImage && !q.statementImageUrl && !q.unblocked)

  function updateQuestion(index: number, patch: Partial<ReviewQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
    if (expandedIndex === index) setExpandedIndex(null)
    else if (expandedIndex !== null && expandedIndex > index) setExpandedIndex(expandedIndex - 1)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Revisão de qualidade
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Revise as questões extraídas antes de gerar as explicações. Você pode editar enunciados, alternativas, gabaritos e remover questões com problemas.
        </Typography>
        <div className="flex items-center gap-3 flex-wrap">
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label={`${withAnswer.length} com gabarito`}
            size="small"
            color="success"
            variant="outlined"
          />
          {withoutAnswer.length > 0 && (
            <Chip
              icon={<ErrorOutlineIcon fontSize="small" />}
              label={`${withoutAnswer.length} sem gabarito`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {needsImage.length > 0 && (
            <Chip
              icon={<ImageIcon fontSize="small" />}
              label={`${needsImage.length} aguardando imagem`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          <Chip label={`${questions.length} total`} size="small" variant="outlined" />
        </div>
      </Box>

      {/* Question list */}
      <Stack spacing={1}>
        {questions.map((q, i) => {
          const isExpanded = expandedIndex === i
          const isBlocked = q.hasImage && !q.unblocked && !q.statementImageUrl
          return (
            <ReviewQuestionCard
              key={`${q.number}-${i}`}
              q={q}
              examBaseId={examBaseId}
              expanded={isExpanded}
              isBlocked={isBlocked}
              onToggle={() => setExpandedIndex(isExpanded ? null : i)}
              onChange={(patch) => updateQuestion(i, patch)}
              onDelete={() => deleteQuestion(i)}
              onImageUploaded={(url) => updateQuestion(i, { statementImageUrl: url, unblocked: true })}
              onUnblock={() => updateQuestion(i, { unblocked: true })}
            />
          )
        })}
      </Stack>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Voltar para gabarito
        </Button>
        <Button
          variant="contained"
          onClick={() => onNext(questions)}
          disabled={questions.length === 0}
          sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
        >
          Próximo: Gerar explicações ({questions.length} questões)
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReviewQuestionCard — editable question card for Phase 4
// ─────────────────────────────────────────────────────────────────────────────

function ReviewQuestionCard({
  q,
  examBaseId,
  expanded,
  isBlocked,
  onToggle,
  onChange,
  onDelete,
  onImageUploaded,
  onUnblock,
}: {
  q: ReviewQuestion
  examBaseId: string
  expanded: boolean
  isBlocked: boolean
  onToggle: () => void
  onChange: (patch: Partial<ReviewQuestion>) => void
  onDelete: () => void
  onImageUploaded: (url: string) => void
  onUnblock: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Local editable state — only used when editing
  const [editState, setEditState] = useState({
    statement: q.statement,
    referenceText: q.referenceText ?? '',
    subject: q.subject,
    topic: q.topic,
    correctAlternative: q.correctAlternative ?? '',
    alternatives: q.alternatives.map((a) => ({ ...a })),
  })

  function startEditing() {
    setEditState({
      statement: q.statement,
      referenceText: q.referenceText ?? '',
      subject: q.subject,
      topic: q.topic,
      correctAlternative: q.correctAlternative ?? '',
      alternatives: q.alternatives.map((a) => ({ ...a })),
    })
    setEditing(true)
  }

  function saveEdits() {
    onChange({
      statement: editState.statement,
      referenceText: editState.referenceText || null,
      subject: editState.subject,
      topic: editState.topic,
      correctAlternative: editState.correctAlternative || null,
      alternatives: editState.alternatives,
    })
    setEditing(false)
  }

  function cancelEditing() {
    setEditing(false)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const { url } = await examBaseQuestionsService.uploadStatementImage(examBaseId, file)
      onImageUploaded(url)
    } catch (err) {
      setUploadError((err as Error).message ?? 'Erro ao subir imagem')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: isBlocked ? 'warning.light' : !q.correctAlternative ? 'error.light' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Collapsed header — always visible */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: isBlocked ? 'warning.50' : !q.correctAlternative ? '#fff3f3' : 'grey.50',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: isBlocked ? 'warning.100' : 'grey.100' },
        }}
        onClick={onToggle}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'text.secondary',
          }}
        />
        <Typography variant="body2" fontWeight={700} sx={{ mr: 0.5 }}>
          Q{q.number}
        </Typography>
        {q.subject && <Chip label={q.subject} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {q.statement.slice(0, 80)}{q.statement.length > 80 ? '…' : ''}
        </Typography>
        {q.correctAlternative && (
          <Chip label={q.correctAlternative} size="small" color="success" sx={{ fontWeight: 700, minWidth: 28 }} />
        )}
        {!q.correctAlternative && (
          <Chip label="?" size="small" color="error" sx={{ fontWeight: 700, minWidth: 28 }} />
        )}
        {isBlocked && <ImageIcon fontSize="small" color="warning" />}
      </Box>

      {/* Expanded body */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          {/* Image upload for blocked questions */}
          {isBlocked && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Esta questão referencia uma imagem/figura.
              </Typography>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <ImageIcon />}
                  disabled={uploading}
                  onClick={() => imageInputRef.current?.click()}
                  sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
                >
                  Upload imagem
                </Button>
                <Button size="small" variant="outlined" startIcon={<LockOpenIcon />} onClick={onUnblock}>
                  Desbloquear
                </Button>
              </div>
              {uploadError && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{uploadError}</Alert>}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
              />
            </Alert>
          )}

          {/* Uploaded image preview */}
          {q.statementImageUrl && (
            <Box sx={{ mb: 2 }}>
              <img src={q.statementImageUrl} alt="Imagem do enunciado" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
            </Box>
          )}

          {editing ? (
            /* ─── Edit mode ─── */
            <Stack spacing={2}>
              <div className="flex gap-2">
                <TextField
                  label="Disciplina"
                  value={editState.subject}
                  onChange={(e) => setEditState((s) => ({ ...s, subject: e.target.value }))}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Tópico"
                  value={editState.topic}
                  onChange={(e) => setEditState((s) => ({ ...s, topic: e.target.value }))}
                  size="small"
                  sx={{ flex: 1 }}
                />
              </div>

              {editState.referenceText !== undefined && (
                <TextField
                  label="Texto de referência"
                  value={editState.referenceText}
                  onChange={(e) => setEditState((s) => ({ ...s, referenceText: e.target.value }))}
                  size="small"
                  multiline
                  minRows={2}
                  maxRows={6}
                  fullWidth
                />
              )}

              <TextField
                label="Enunciado"
                value={editState.statement}
                onChange={(e) => setEditState((s) => ({ ...s, statement: e.target.value }))}
                size="small"
                multiline
                minRows={2}
                maxRows={8}
                fullWidth
              />

              <Typography variant="body2" fontWeight={600}>Alternativas</Typography>
              <RadioGroup
                value={editState.correctAlternative}
                onChange={(e) => setEditState((s) => ({ ...s, correctAlternative: e.target.value }))}
              >
                {editState.alternatives.map((alt, altIdx) => (
                  <div key={alt.key} className="flex items-start gap-2 mb-1">
                    <FormControlLabel
                      value={alt.key}
                      control={<Radio size="small" />}
                      label=""
                      sx={{ mr: 0, ml: 0 }}
                    />
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 1, minWidth: 20 }}>
                      {alt.key})
                    </Typography>
                    <TextField
                      value={alt.text}
                      onChange={(e) => {
                        const updated = [...editState.alternatives]
                        updated[altIdx] = { ...updated[altIdx], text: e.target.value }
                        setEditState((s) => ({ ...s, alternatives: updated }))
                      }}
                      size="small"
                      fullWidth
                      multiline
                      maxRows={3}
                    />
                  </div>
                ))}
              </RadioGroup>

              <div className="flex gap-2">
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={saveEdits}
                  sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
                >
                  Salvar alterações
                </Button>
                <Button size="small" variant="outlined" onClick={cancelEditing}>
                  Cancelar
                </Button>
              </div>
            </Stack>
          ) : (
            /* ─── View mode ─── */
            <>
              {q.referenceText && (
                <Box sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                    Texto de referência
                  </Typography>
                  <Markdown variant="body2">{q.referenceText}</Markdown>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Markdown variant="body2">{q.statement}</Markdown>
              </Box>

              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {q.alternatives.map((alt) => {
                  const isCorrect = alt.key === q.correctAlternative
                  return (
                    <Box
                      key={alt.key}
                      sx={{
                        border: '1px solid',
                        borderColor: isCorrect ? 'success.light' : 'divider',
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                        bgcolor: isCorrect ? 'success.50' : 'transparent',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 20, color: isCorrect ? 'success.main' : 'text.primary' }}>
                          {alt.key})
                        </Typography>
                        <Markdown variant="body2">{alt.text}</Markdown>
                      </div>
                    </Box>
                  )
                })}
              </Stack>

              {q.topic && (
                <Typography variant="caption" color="text.secondary">
                  Tópico: {q.topic}
                </Typography>
              )}
            </>
          )}

          {/* Action buttons */}
          {!editing && (
            <div className="flex gap-2 mt-3 pt-2 border-t border-slate-200">
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={startEditing}>
                Editar
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={onDelete}>
                Remover
              </Button>
            </div>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Explicações (AI explanation generation + save)
// ─────────────────────────────────────────────────────────────────────────────

type QuestionGenStatus = 'pending' | 'generating' | 'done' | 'skipped' | 'error'

type ExplanationQuestion = ReviewQuestion & {
  genStatus: QuestionGenStatus
  genError?: string
}

function ExplanationsStep({
  examBaseId,
  reviewedQuestions,
  onBack,
}: {
  examBaseId: string
  reviewedQuestions: ReviewQuestion[]
  onBack: () => void
}) {
  const navigate = useNavigate()
  const { data: examBase } = useExamBaseQuery(examBaseId)
  const saveMutation = useCreateBatchQuestionsMutation(examBaseId)
  const updatePhaseMutation = useUpdateExamBaseMutation(examBaseId)
  const [questions, setQuestions] = useState<ExplanationQuestion[]>(() =>
    reviewedQuestions.map((q) => ({
      ...q,
      genStatus: q.correctAlternative ? 'pending' : 'skipped',
    }))
  )
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'generating' | 'done'>('idle')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const abortRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void generateAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateQ(index: number, patch: Partial<ExplanationQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  async function generateOne(q: ExplanationQuestion, index: number): Promise<ExplanationQuestion> {
    if (!q.correctAlternative) return { ...q, genStatus: 'skipped' }
    updateQ(index, { genStatus: 'generating' })
    try {
      const resp = await examBaseQuestionsService.generateExplanationsInline(examBaseId, {
        subject: q.subject || undefined,
        statement: q.statement,
        referenceText: q.referenceText,
        statementImageUrl: q.statementImageUrl,
        correctAlternative: q.correctAlternative,
        alternatives: q.alternatives,
      })
      const updated: ExplanationQuestion = {
        ...q,
        topic: resp.topic || q.topic,
        subtopics: resp.subtopics.length ? resp.subtopics : q.subtopics,
        explanations: resp.explanations,
        answerDoubt: !resp.agreesWithCorrectAnswer,
        doubtReason: resp.disagreementWarning ?? null,
        genStatus: 'done',
      }
      updateQ(index, updated)
      return updated
    } catch (err) {
      const errMsg = (err as Error).message ?? 'Erro desconhecido'
      updateQ(index, { genStatus: 'error', genError: errMsg })
      return { ...q, genStatus: 'error', genError: errMsg }
    }
  }

  async function generateAll() {
    abortRef.current = false
    setGlobalStatus('generating')
    for (let i = 0; i < questions.length; i++) {
      if (abortRef.current) break
      const q = questions[i]
      if (q.genStatus === 'done' || q.genStatus === 'skipped') continue
      // Re-read latest state for this question
      const latest = await new Promise<ExplanationQuestion>((resolve) => {
        setQuestions((prev) => { resolve(prev[i]); return prev })
      })
      if (latest.genStatus === 'done' || latest.genStatus === 'skipped') continue
      await generateOne(latest, i)
    }
    setGlobalStatus('done')
  }

  async function retryFailed() {
    abortRef.current = false
    setGlobalStatus('generating')
    for (let i = 0; i < questions.length; i++) {
      if (abortRef.current) break
      const latest = await new Promise<ExplanationQuestion>((resolve) => {
        setQuestions((prev) => { resolve(prev[i]); return prev })
      })
      if (latest.genStatus !== 'error') continue
      await generateOne(latest, i)
    }
    setGlobalStatus('done')
  }

  async function retrySingle(index: number) {
    const latest = await new Promise<ExplanationQuestion>((resolve) => {
      setQuestions((prev) => { resolve(prev[index]); return prev })
    })
    await generateOne(latest, index)
  }

  async function handleSave() {
    const payload = questions.map((q) => ({
      subject: q.subject,
      topic: q.topic,
      subtopics: q.subtopics,
      statement: q.statement,
      referenceText: q.referenceText ?? undefined,
      statementImageUrl: q.statementImageUrl ?? undefined,
      correctAlternative: q.correctAlternative ?? undefined,
      alternatives: q.alternatives.map((a) => ({
        key: a.key,
        text: a.text,
        explanation: q.explanations.find((e) => e.key === a.key)?.explanation ?? '',
      })),
    }))
    await saveMutation.mutateAsync(payload)
    updatePhaseMutation.mutate({ processingPhase: 'CONCLUIDO' })
    const examBoardId = examBase?.examBoardId
    if (examBoardId) {
      navigate({ to: '/exams/$examBoard/$examId', params: { examBoard: examBoardId, examId: examBaseId } })
    }
  }

  const doneCount = questions.filter((q) => q.genStatus === 'done').length
  const errorCount = questions.filter((q) => q.genStatus === 'error').length
  const skippedCount = questions.filter((q) => q.genStatus === 'skipped').length
  const doubtCount = questions.filter((q) => q.answerDoubt).length
  const pendingOrGenerating = questions.filter((q) => q.genStatus === 'pending' || q.genStatus === 'generating').length
  const isGenerating = globalStatus === 'generating'
  const progressValue = questions.length > 0
    ? Math.round(((doneCount + errorCount + skippedCount) / questions.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Progress panel */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Gerando explicações (Claude Sonnet)
        </Typography>
        {isGenerating && (
          <StepProgressBar
            label={`${doneCount + errorCount} de ${questions.length - skippedCount} questões processadas...`}
            value={progressValue}
          />
        )}
        {globalStatus === 'done' && errorCount === 0 && (
          <StepProgressBar label={`Explicações geradas para ${doneCount} questões!`} value={100} color="success" />
        )}
        {globalStatus === 'done' && errorCount > 0 && (
          <StepProgressBar
            label={`${doneCount} geradas, ${errorCount} com erro`}
            value={100}
            color="error"
          />
        )}

        {/* Summary chips */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label={`${doneCount} geradas`}
            size="small"
            color="success"
            variant="outlined"
          />
          {errorCount > 0 && (
            <Chip
              icon={<ErrorOutlineIcon fontSize="small" />}
              label={`${errorCount} com erro`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {skippedCount > 0 && (
            <Chip label={`${skippedCount} sem gabarito`} size="small" variant="outlined" />
          )}
          {doubtCount > 0 && (
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label={`${doubtCount} gabarito duvidoso`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </div>

        {/* Retry all errors */}
        {globalStatus === 'done' && errorCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={retryFailed}
            sx={{ mt: 2 }}
            startIcon={<AutoAwesomeIcon />}
          >
            Tentar novamente ({errorCount} com erro)
          </Button>
        )}
      </Box>

      {/* Question list */}
      <Stack spacing={1}>
        {questions.map((q, i) => (
          <ExplanationQuestionCard
            key={`${q.number}-${i}`}
            q={q}
            expanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
            onRetry={() => retrySingle(i)}
            onUpdateExplanation={(altKey, text) => {
              const newExplanations = q.explanations.map((e) =>
                e.key === altKey ? { ...e, explanation: text } : e
              )
              updateQ(i, { explanations: newExplanations })
            }}
            onResolveDoubt={(newCorrect) => {
              updateQ(i, {
                correctAlternative: newCorrect,
                answerDoubt: false,
                doubtReason: null,
              })
            }}
          />
        ))}
      </Stack>

      {/* Save / navigate */}
      {saveMutation.isError && (
        <Alert severity="error">{(saveMutation.error as Error)?.message ?? 'Erro ao salvar questões'}</Alert>
      )}
      {saveMutation.isSuccess && (
        <Alert severity="success">{questions.length} questões salvas com sucesso!</Alert>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />} disabled={isGenerating}>
          Voltar para revisão
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isGenerating || pendingOrGenerating > 0 || saveMutation.isPending || saveMutation.isSuccess}
          startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
        >
          {saveMutation.isPending ? 'Salvando...' : `Salvar ${questions.length} questões`}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExplanationQuestionCard — shows question with generated explanations
// ─────────────────────────────────────────────────────────────────────────────

function ExplanationQuestionCard({
  q,
  expanded,
  onToggle,
  onRetry,
  onUpdateExplanation,
  onResolveDoubt,
}: {
  q: ExplanationQuestion
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
  onUpdateExplanation: (altKey: string, text: string) => void
  onResolveDoubt: (newCorrectAlternative: string) => void
}) {
  const [editingAltKey, setEditingAltKey] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const statusColor =
    q.genStatus === 'done' ? 'success' :
    q.genStatus === 'error' ? 'error' :
    q.genStatus === 'generating' ? 'info' :
    q.genStatus === 'skipped' ? 'default' : 'default'

  const statusLabel =
    q.genStatus === 'done' ? 'OK' :
    q.genStatus === 'error' ? 'Erro' :
    q.genStatus === 'generating' ? '...' :
    q.genStatus === 'skipped' ? 'Pulada' : 'Pendente'

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: q.answerDoubt ? 'warning.main' : q.genStatus === 'error' ? 'error.light' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: q.answerDoubt ? 'warning.50' : q.genStatus === 'error' ? '#fff3f3' : 'grey.50',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.100' },
        }}
        onClick={onToggle}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'text.secondary',
          }}
        />
        <Typography variant="body2" fontWeight={700} sx={{ mr: 0.5 }}>
          Q{q.number}
        </Typography>
        {q.subject && <Chip label={q.subject} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {q.statement.slice(0, 80)}{q.statement.length > 80 ? '…' : ''}
        </Typography>
        {q.genStatus === 'generating' && <CircularProgress size={16} />}
        <Chip
          label={statusLabel}
          size="small"
          color={statusColor as 'success' | 'error' | 'info' | 'default'}
          sx={{ fontWeight: 700, minWidth: 40 }}
        />
        {q.correctAlternative && (
          <Chip label={q.correctAlternative} size="small" color="success" sx={{ fontWeight: 700, minWidth: 28 }} />
        )}
        {q.answerDoubt && <WarningAmberIcon fontSize="small" color="warning" />}
      </Box>

      {/* Expanded body */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          {/* Error state */}
          {q.genStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <Button size="small" color="inherit" onClick={onRetry} startIcon={<AutoAwesomeIcon />}>
                Tentar novamente
              </Button>
            }>
              {q.genError ?? 'Erro ao gerar explicações'}
            </Alert>
          )}

          {/* Answer doubt warning */}
          {q.answerDoubt && q.doubtReason && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                A IA discorda do gabarito
              </Typography>
              <Typography variant="body2" mb={1.5}>{q.doubtReason}</Typography>
              <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
                Alterar gabarito para:
              </Typography>
              <div className="flex gap-1 flex-wrap">
                {q.alternatives.map((alt) => (
                  <Button
                    key={alt.key}
                    size="small"
                    variant={alt.key === q.correctAlternative ? 'contained' : 'outlined'}
                    onClick={() => onResolveDoubt(alt.key)}
                    sx={{
                      minWidth: 36,
                      ...(alt.key === q.correctAlternative
                        ? { bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }
                        : {}),
                    }}
                  >
                    {alt.key}
                  </Button>
                ))}
              </div>
            </Alert>
          )}

          {/* Statement preview */}
          <Box sx={{ mb: 2 }}>
            <Markdown variant="body2">{q.statement}</Markdown>
          </Box>

          {/* Alternatives with explanations */}
          <Stack spacing={1}>
            {q.alternatives.map((alt) => {
              const isCorrect = alt.key === q.correctAlternative
              const explanation = q.explanations.find((e) => e.key === alt.key)?.explanation
              const isEditing = editingAltKey === alt.key

              return (
                <Box
                  key={alt.key}
                  sx={{
                    border: '1px solid',
                    borderColor: isCorrect ? 'success.light' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  {/* Alternative text */}
                  <Box sx={{ px: 1.5, py: 1, bgcolor: isCorrect ? 'success.50' : 'transparent' }}>
                    <div className="flex items-start gap-2">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ minWidth: 20, color: isCorrect ? 'success.main' : 'text.primary' }}
                      >
                        {alt.key})
                      </Typography>
                      <Markdown variant="body2">{alt.text}</Markdown>
                    </div>
                  </Box>

                  {/* Explanation */}
                  {explanation && (
                    <Box sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', borderTop: '1px dashed', borderColor: 'divider' }}>
                      {isEditing ? (
                        <Stack spacing={1}>
                          <TextField
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            size="small"
                            multiline
                            minRows={2}
                            maxRows={8}
                            fullWidth
                          />
                          <div className="flex gap-1">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => { onUpdateExplanation(alt.key, editText); setEditingAltKey(null) }}
                              sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
                            >
                              Salvar
                            </Button>
                            <Button size="small" onClick={() => setEditingAltKey(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </Stack>
                      ) : (
                        <div className="flex items-start gap-2">
                          <Box sx={{ flex: 1 }}>
                            <Markdown variant="caption">{explanation}</Markdown>
                          </Box>
                          <Tooltip title="Editar explicação">
                            <IconButton
                              size="small"
                              onClick={() => { setEditingAltKey(alt.key); setEditText(explanation) }}
                              sx={{ ml: 0.5, mt: -0.5 }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      )}
                    </Box>
                  )}
                </Box>
              )
            })}
          </Stack>

          {/* Topic / subtopics */}
          {q.genStatus === 'done' && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {q.topic && (
                <Typography variant="caption" color="text.secondary">
                  Tópico: {q.topic}
                </Typography>
              )}
              {q.subtopics.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  · {q.subtopics.join(', ')}
                </Typography>
              )}
            </div>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function ExamEditPage() {
  const { examBaseId } = Route.useParams()
  const navigate = useNavigate()
  const { data: examBase } = useExamBaseQuery(examBaseId)
  const updateMutation = useUpdateExamBaseMutation(examBaseId)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [initialPhaseApplied, setInitialPhaseApplied] = useState(false)
  const [structuredQuestions, setStructuredQuestions] = useState<ParsedQuestionStructure[]>([])
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [reviewedQuestions, setReviewedQuestions] = useState<ReviewQuestion[]>([])

  // Restore step from persisted processingPhase on load
  useEffect(() => {
    if (!examBase || initialPhaseApplied) return
    const phase = examBase.processingPhase
    if (phase) {
      setStep(PHASE_TO_STEP[phase] as 1 | 2 | 3 | 4 | 5)
    }
    setInitialPhaseApplied(true)
  }, [examBase, initialPhaseApplied])

  function handleStepChange(newStep: 1 | 2 | 3 | 4 | 5) {
    setStep(newStep)
    const phase = STEP_TO_PHASE[newStep]
    if (phase) {
      updateMutation.mutate({ processingPhase: phase })
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconButton
          size="small"
          onClick={() => navigate({ to: '/exams', search: { board: undefined } })}
          className="text-slate-500"
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          Criar exame
        </Typography>
        {examBase?.processingPhase && examBase.processingPhase !== 'CONCLUIDO' && (
          <Chip
            label={`Fase: ${examBase.processingPhase}`}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto', textTransform: 'capitalize' }}
          />
        )}
        {examBase?.processingPhase === 'CONCLUIDO' && (
          <Chip
            label="Concluído"
            size="small"
            color="success"
            sx={{ ml: 'auto' }}
          />
        )}
      </div>

      <StepIndicator step={step} onStepClick={(s) => handleStepChange(s as 1 | 2 | 3 | 4 | 5)} />

      {step === 1 && (
        <MetadataStep examBaseId={examBaseId} onNext={() => handleStepChange(2)} />
      )}
      {step === 2 && (
        <ExamPdfStep
          examBaseId={examBaseId}
          onNext={(qs) => { setStructuredQuestions(qs); handleStepChange(3) }}
          onBack={() => handleStepChange(1)}
        />
      )}
      {step === 3 && (
        <GabaritoStep
          examBaseId={examBaseId}
          structuredQuestions={structuredQuestions}
          onNext={(key) => { setAnswerKey(key); handleStepChange(4) }}
          onBack={() => handleStepChange(2)}
        />
      )}
      {step === 4 && (
        <ReviewStep
          examBaseId={examBaseId}
          structuredQuestions={structuredQuestions}
          answerKey={answerKey}
          onNext={(reviewed) => { setReviewedQuestions(reviewed); handleStepChange(5) }}
          onBack={() => handleStepChange(3)}
        />
      )}
      {step === 5 && (
        <ExplanationsStep
          examBaseId={examBaseId}
          reviewedQuestions={reviewedQuestions}
          onBack={() => handleStepChange(4)}
        />
      )}
    </div>
  )
}
