import {
  useCreateExamBoardMutation,
  useExamBoardQueries,
} from '@/features/examBoard/queries/examBoard.queries'
import {
  useExamBaseQuery,
  useExtractExamMetadataMutation,
  useUpdateExamBaseMutation,
} from '@/features/examBase/queries/examBase.queries'
import type { ExtractedExamMetadata } from '@/features/examBase/domain/examBase.types'
import { StateCitySelect } from '@/components/StateCitySelect'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
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

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Metadados', 'Questões']
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1
        const active = step === idx
        const done = step > idx
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                ${active ? 'bg-violet-600 text-white' : done ? 'bg-violet-200 text-violet-700' : 'bg-slate-200 text-slate-500'}`}
            >
              {idx}
            </div>
            <span
              className={`text-sm font-medium ${active ? 'text-violet-700' : 'text-slate-500'}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-slate-300 mx-1" />
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

        <div className="flex justify-end pt-2">
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={updateMutation.isPending}
            startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
          >
            Próximo: Questões
          </Button>
        </div>
      </Stack>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Questions (placeholder)
// ─────────────────────────────────────────────────────────────────────────────

function QuestionsStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
        <AutoAwesomeIcon className="text-violet-500" style={{ fontSize: 32 }} />
      </div>
      <Typography variant="h6" fontWeight={600} color="text.primary">
        Questões
      </Typography>
      <Typography variant="body2" color="text.secondary" className="text-center max-w-sm">
        A funcionalidade de adição de questões estará disponível em breve.
      </Typography>
      <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
        Voltar para metadados
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function ExamEditPage() {
  const { examBaseId } = Route.useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)

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
      </div>

      <StepIndicator step={step} />

      {step === 1 ? (
        <MetadataStep examBaseId={examBaseId} onNext={() => setStep(2)} />
      ) : (
        <QuestionsStep onBack={() => setStep(1)} />
      )}
    </div>
  )
}
