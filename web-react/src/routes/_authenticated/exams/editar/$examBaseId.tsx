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
import {
  useParseQuestionsFromPdfsMutation,
  useCreateBatchQuestionsMutation,
  type ParsedQuestionFromPdf,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'
import { StateCitySelect } from '@/components/StateCitySelect'
import { Markdown } from '@/components/Markdown'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ImageIcon from '@mui/icons-material/Image'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import {
  Alert,
  Box,
  Button,
  Chip,
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

// ─────────────────────────────────────────────────────────────────────────────
// Question card (review UI)
// ─────────────────────────────────────────────────────────────────────────────

type ReviewQuestion = ParsedQuestionFromPdf & {
  unblocked: boolean
  statementImageUrl?: string
}

function QuestionCard({
  q,
  index,
  examBaseId,
  onUnblock,
  onImageUploaded,
}: {
  q: ReviewQuestion
  index: number
  examBaseId: string
  onUnblock: (index: number) => void
  onImageUploaded: (index: number, url: string) => void
}) {
  const [showExplanations, setShowExplanations] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const isBlocked = q.hasImage && !q.unblocked && !q.statementImageUrl

  async function handleImageUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const { url } = await examBaseQuestionsService.uploadStatementImage(examBaseId, file)
      onImageUploaded(index, url)
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
        borderColor: isBlocked ? 'warning.light' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: isBlocked ? 'warning.50' : 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="body2" fontWeight={700} sx={{ mr: 0.5 }}>
          Questão {q.number}
        </Typography>
        {q.subject && <Chip label={q.subject} size="small" variant="outlined" />}
        {q.topic && (
          <Typography variant="caption" color="text.secondary">
            {q.topic}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {q.correctAlternative && (
          <Chip
            label={`Gabarito: ${q.correctAlternative}`}
            size="small"
            color="success"
            variant="filled"
          />
        )}
        {q.answerDoubt && (
          <Chip
            icon={<WarningAmberIcon fontSize="small" />}
            label="Gabarito duvidoso"
            size="small"
            color="warning"
            variant="filled"
          />
        )}
        {isBlocked && (
          <Chip
            icon={<ImageIcon fontSize="small" />}
            label="Imagem necessária"
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
      </Box>

      {/* Body */}
      <Box sx={{ px: 2, py: 2, position: 'relative' }}>
        {/* Blocked overlay */}
        {isBlocked && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255,255,255,0.85)',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              p: 2,
            }}
          >
            <ImageIcon sx={{ fontSize: 36, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Esta questão referencia uma imagem/figura. Faça upload ou desbloqueie manualmente.
            </Typography>
            <div className="flex gap-2 flex-wrap justify-center">
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
              <Button
                size="small"
                variant="outlined"
                startIcon={<LockOpenIcon />}
                onClick={() => onUnblock(index)}
              >
                Desbloquear
              </Button>
            </div>
            {uploadError && (
              <Alert severity="error" sx={{ py: 0, mt: 0.5 }}>
                {uploadError}
              </Alert>
            )}
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
          </Box>
        )}

        {/* Gabarito doubt warning */}
        {q.answerDoubt && q.doubtReason && (
          <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2" fontWeight={600}>
              Atenção: gabarito possivelmente incorreto
            </Typography>
            <Typography variant="body2">{q.doubtReason}</Typography>
          </Alert>
        )}

        {/* Uploaded image */}
        {q.statementImageUrl && (
          <Box sx={{ mb: 2 }}>
            <img
              src={q.statementImageUrl}
              alt="Imagem do enunciado"
              style={{ maxWidth: '100%', borderRadius: 4 }}
            />
          </Box>
        )}

        {/* Reference text */}
        {q.referenceText && (
          <Box
            sx={{
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              Texto de referência
            </Typography>
            <Markdown variant="body2">{q.referenceText}</Markdown>
          </Box>
        )}

        {/* Statement */}
        <Box sx={{ mb: 2 }}>
          <Markdown variant="body2">{q.statement}</Markdown>
        </Box>

        {/* Alternatives */}
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {q.alternatives.map((alt) => {
            const isCorrect = alt.key === q.correctAlternative
            return (
              <Box
                key={alt.key}
                sx={{
                  border: '1px solid',
                  borderColor: isCorrect ? 'success.light' : 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: isCorrect ? 'success.50' : 'transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ minWidth: 20, color: isCorrect ? 'success.main' : 'text.primary' }}
                  >
                    {alt.key})
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Markdown variant="body2">{alt.text}</Markdown>
                    {showExplanations && alt.explanation && (
                      <Box
                        sx={{
                          mt: 1,
                          pt: 1,
                          borderTop: '1px dashed',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Explicação:
                        </Typography>
                        <Markdown variant="caption">{alt.explanation}</Markdown>
                      </Box>
                    )}
                  </Box>
                </div>
              </Box>
            )
          })}
        </Stack>

        <Button
          size="small"
          variant="text"
          sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
          onClick={() => setShowExplanations((v) => !v)}
        >
          {showExplanations ? 'Ocultar explicações' : 'Ver explicações'}
        </Button>
      </Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Questions
// ─────────────────────────────────────────────────────────────────────────────

function QuestionsStep({
  examBaseId,
  onBack,
}: {
  examBaseId: string
  onBack: () => void
}) {
  const parseMutation = useParseQuestionsFromPdfsMutation(examBaseId)
  const saveMutation = useCreateBatchQuestionsMutation(examBaseId)

  const [examPdf, setExamPdf] = useState<File | null>(null)
  const [gabaritoPdf, setGabaritoPdf] = useState<File | null>(null)
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const examPdfRef = useRef<HTMLInputElement>(null)
  const gabaritoPdfRef = useRef<HTMLInputElement>(null)

  async function handleParse() {
    if (!examPdf || !gabaritoPdf) return
    const result = await parseMutation.mutateAsync({ examPdf, gabaritoPdf })
    setQuestions(
      result.questions.map((q) => ({ ...q, unblocked: false })),
    )
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
        explanation: a.explanation,
      })),
    }))
    await saveMutation.mutateAsync(payload)
    setQuestions([])
    setExamPdf(null)
    setGabaritoPdf(null)
  }

  const blockedCount = questions.filter(
    (q) => q.hasImage && !q.unblocked && !q.statementImageUrl,
  ).length
  const doubtCount = questions.filter((q) => q.answerDoubt).length

  return (
    <div className="flex flex-col gap-6">
      {/* Upload panel */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Analisar PDFs com IA
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Envie a prova e o gabarito. O Claude extrairá as questões de enfermagem com respostas e explicações.
        </Typography>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              Prova (PDF)
            </Typography>
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="small"
                onClick={() => examPdfRef.current?.click()}
              >
                {examPdf ? examPdf.name : 'Selecionar PDF'}
              </Button>
              {examPdf && (
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                  onClick={() => {
                    setExamPdf(null)
                    if (examPdfRef.current) examPdfRef.current.value = ''
                  }}
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={examPdfRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setExamPdf(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              Gabarito (PDF)
            </Typography>
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="small"
                onClick={() => gabaritoPdfRef.current?.click()}
              >
                {gabaritoPdf ? gabaritoPdf.name : 'Selecionar PDF'}
              </Button>
              {gabaritoPdf && (
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                  onClick={() => {
                    setGabaritoPdf(null)
                    if (gabaritoPdfRef.current) gabaritoPdfRef.current.value = ''
                  }}
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={gabaritoPdfRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setGabaritoPdf(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="contained"
            startIcon={
              parseMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            disabled={!examPdf || !gabaritoPdf || parseMutation.isPending}
            onClick={handleParse}
            sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
          >
            {parseMutation.isPending ? 'Analisando...' : 'Analisar com IA'}
          </Button>
          {parseMutation.isPending && (
            <Typography variant="caption" color="text.secondary">
              Isso pode levar alguns minutos para PDFs grandes.
            </Typography>
          )}
        </div>

        {parseMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(parseMutation.error as Error)?.message ?? 'Erro ao analisar PDFs'}
          </Alert>
        )}
      </Box>

      {/* Results */}
      {questions.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Typography variant="subtitle1" fontWeight={600}>
              {questions.length} questões extraídas
            </Typography>
            {blockedCount > 0 && (
              <Chip
                icon={<ImageIcon fontSize="small" />}
                label={`${blockedCount} aguardando imagem`}
                size="small"
                color="warning"
              />
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

          <Stack spacing={2}>
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                index={i}
                examBaseId={examBaseId}
                onUnblock={(idx) =>
                  setQuestions((prev) =>
                    prev.map((item, j) =>
                      j === idx ? { ...item, unblocked: true } : item,
                    ),
                  )
                }
                onImageUploaded={(idx, url) =>
                  setQuestions((prev) =>
                    prev.map((item, j) =>
                      j === idx ? { ...item, statementImageUrl: url, unblocked: true } : item,
                    ),
                  )
                }
              />
            ))}
          </Stack>

          {saveMutation.isError && (
            <Alert severity="error">
              {(saveMutation.error as Error)?.message ?? 'Erro ao salvar questões'}
            </Alert>
          )}

          {saveMutation.isSuccess && (
            <Alert severity="success">
              {questions.length} questões salvas com sucesso!
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saveMutation.isPending || saveMutation.isSuccess}
              startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
            >
              {saveMutation.isPending
                ? 'Salvando...'
                : `Salvar ${questions.length} questões`}
            </Button>
          </div>
        </>
      )}

      <Divider />

      <div>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Voltar para metadados
        </Button>
      </div>
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
        <QuestionsStep examBaseId={examBaseId} onBack={() => setStep(1)} />
      )}
    </div>
  )
}
