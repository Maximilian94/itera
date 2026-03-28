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
  useCreateBatchQuestionsMutation,
  type ParsedQuestionStructure,
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
  LinearProgress,
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

const WIZARD_STEPS = ['Metadados', 'Prova', 'Gabarito', 'Revisão']

/** Splits markdown at question boundaries into chunks of at most `size` questions. */
function splitMarkdownIntoChunks(markdown: string, size = 10): string[] {
  const boundaries: number[] = [0]
  const regex = /(?:^|\n)\s*(?:\d+[.)]\s|Questão\s+\d+(?:\s|[-–:])|\d+\s*[-–]\s|#\s*\d+\.?\s)/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(markdown)) !== null) {
    if (m.index !== boundaries[boundaries.length - 1]) boundaries.push(m.index)
  }
  boundaries.push(markdown.length)
  if (boundaries.length - 2 <= 0) return [markdown]
  const chunks: string[] = []
  for (let i = 0; i < boundaries.length - 1; i += size) {
    const start = boundaries[i]
    const end = boundaries[Math.min(i + size, boundaries.length - 1)]
    const chunk = markdown.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
  }
  return chunks
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 flex-wrap">
      {WIZARD_STEPS.map((label, i) => {
        const idx = i + 1
        const active = step === idx
        const done = step > idx
        return (
          <div key={label} className="flex items-center gap-1">
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

type ReviewQuestion = ParsedQuestionStructure & {
  correctAlternative: string | null
  answerDoubt: boolean
  doubtReason: string | null
  explanations: { key: string; explanation: string }[]
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
                    {showExplanations && (() => {
                      const exp = q.explanations.find((e) => e.key === alt.key)?.explanation
                      return exp ? (
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
                          <Markdown variant="caption">{exp}</Markdown>
                        </Box>
                      ) : null
                    })()}
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared progress bar
// ─────────────────────────────────────────────────────────────────────────────

function StepProgressBar({
  label,
  value,
  color = 'primary',
}: {
  label: string
  value: number
  color?: 'primary' | 'success' | 'error'
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <div className="flex items-center justify-between mb-1">
        <Typography variant="caption" color={color === 'error' ? 'error.main' : 'text.secondary'}>
          {label}
        </Typography>
        {color !== 'error' && (
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {value}%
          </Typography>
        )}
      </div>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Prova PDF → Claude Sonnet extracts questions
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
  const [status, setStatus] = useState<'idle' | 'extracting-markdown' | 'parsing-chunks' | 'done' | 'error'>('idle')
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 })
  const [questions, setQuestions] = useState<ParsedQuestionStructure[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleParse() {
    if (!file) return
    setStatus('extracting-markdown')
    setErrorMsg(null)
    setQuestions([])

    try {
      // Phase 1: Nanonets → markdown (preserves bold, italic, images, etc.)
      const { content: markdown } = await examBaseQuestionsService.extractFromPdf(examBaseId, file)

      // Phase 2: split markdown into chunks of 10 questions
      const chunks = splitMarkdownIntoChunks(markdown, 10)
      setChunkProgress({ current: 0, total: chunks.length })
      setStatus('parsing-chunks')

      // Phase 3: Claude Sonnet processes each chunk (no timeout risk per call)
      const all: ParsedQuestionStructure[] = []
      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length })
        const { questions: qs } = await examBaseQuestionsService.parseQuestionsStructureFromChunk(examBaseId, chunks[i])
        all.push(...qs)
      }

      setQuestions(all)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg((err as Error).message ?? 'Erro ao extrair questões da prova')
    }
  }

  const progressValue = chunkProgress.total > 0
    ? Math.round((chunkProgress.current / chunkProgress.total) * 100)
    : 0
  const isParsing = status === 'extracting-markdown' || status === 'parsing-chunks'

  return (
    <div className="flex flex-col gap-6">
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Prova (PDF)
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Envie o PDF da prova. O texto é extraído via Nanonets (preserva negrito, itálico, imagens, etc.) e processado em blocos de 10 questões pelo Claude Sonnet.
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

        {status === 'extracting-markdown' && (
          <StepProgressBar label="Extraindo texto da prova (Nanonets)..." value={10} />
        )}

        {status === 'parsing-chunks' && (
          <StepProgressBar
            label={`Extraindo questões — bloco ${chunkProgress.current} de ${chunkProgress.total} (Claude Sonnet)...`}
            value={10 + progressValue * 0.9}
          />
        )}

        {isParsing && (
          <Button variant="contained" startIcon={<CircularProgress size={16} color="inherit" />} disabled sx={{ mt: 2, bgcolor: 'violet.600' }}>
            Extraindo...
          </Button>
        )}

        {status === 'done' && (
          <StepProgressBar label={`${questions.length} questões extraídas!`} value={100} color="success" />
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
  onNext,
  onBack,
}: {
  examBaseId: string
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

  const answerCount = Object.keys(answerKey).length

  return (
    <div className="flex flex-col gap-6">
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
            <StepProgressBar label="Extraindo gabarito (Claude Haiku)..." value={50} />
            <Button variant="contained" startIcon={<CircularProgress size={16} color="inherit" />} disabled sx={{ mt: 2, bgcolor: 'violet.600' }}>
              Extraindo...
            </Button>
          </>
        )}

        {status === 'done' && (
          <>
            <StepProgressBar label={`${answerCount} respostas extraídas!`} value={100} color="success" />
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider', maxHeight: 120, overflow: 'auto' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Gabarito extraído:
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {Object.entries(answerKey).map(([k, v]) => `${k}: ${v}`).join('  ')}
              </Typography>
            </Box>
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

      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Voltar
        </Button>
        <Button
          variant="contained"
          disabled={status !== 'done' || answerCount === 0}
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
// Step 5 — Review (match + explanations + save)
// ─────────────────────────────────────────────────────────────────────────────

function ReviewStep({
  examBaseId,
  structuredQuestions,
  answerKey,
  onBack,
}: {
  examBaseId: string
  structuredQuestions: ParsedQuestionStructure[]
  answerKey: Record<string, string>
  onBack: () => void
}) {
  const saveMutation = useCreateBatchQuestionsMutation(examBaseId)
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 })
  const [status, setStatus] = useState<'generating' | 'done' | 'error'>('generating')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    // Phase 4: match answers (instant)
    const matched: ReviewQuestion[] = structuredQuestions.map((q) => ({
      ...q,
      correctAlternative: answerKey[String(q.number)] ?? null,
      answerDoubt: false,
      doubtReason: null,
      explanations: [],
      unblocked: false,
    }))

    // Phase 5: generate explanations per question
    void generateAllExplanations(matched)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateAllExplanations(matched: ReviewQuestion[]) {
    setGenProgress({ current: 0, total: matched.length })
    const result: ReviewQuestion[] = []
    try {
      for (let i = 0; i < matched.length; i++) {
        const q = matched[i]
        setGenProgress({ current: i + 1, total: matched.length })
        if (!q.correctAlternative) {
          result.push(q)
          setQuestions([...result])
          continue
        }
        try {
          const resp = await examBaseQuestionsService.generateExplanationsInline(examBaseId, {
            subject: q.subject || undefined,
            statement: q.statement,
            referenceText: q.referenceText,
            statementImageUrl: q.statementImageUrl,
            correctAlternative: q.correctAlternative,
            alternatives: q.alternatives,
          })
          result.push({
            ...q,
            topic: resp.topic || q.topic,
            subtopics: resp.subtopics.length ? resp.subtopics : q.subtopics,
            explanations: resp.explanations,
            answerDoubt: !resp.agreesWithCorrectAnswer,
            doubtReason: resp.disagreementWarning ?? null,
          })
        } catch {
          result.push(q)
        }
        setQuestions([...result])
      }
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg((err as Error).message ?? 'Erro ao gerar explicações')
    }
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
  }

  const blockedCount = questions.filter((q) => q.hasImage && !q.unblocked && !q.statementImageUrl).length
  const doubtCount = questions.filter((q) => q.answerDoubt).length
  const progressValue = genProgress.total > 0
    ? Math.round((genProgress.current / genProgress.total) * 100)
    : 0
  const isGenerating = status === 'generating'

  return (
    <div className="flex flex-col gap-6">
      {/* Generation progress */}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
          Gerando explicações (xAI Grok)
        </Typography>
        {isGenerating && (
          <StepProgressBar
            label={`Questão ${genProgress.current} de ${genProgress.total}...`}
            value={progressValue}
          />
        )}
        {status === 'done' && (
          <StepProgressBar label={`Explicações geradas para ${questions.length} questões!`} value={100} color="success" />
        )}
        {status === 'error' && errorMsg && (
          <Alert severity="error" sx={{ mt: 1 }}>{errorMsg}</Alert>
        )}
      </Box>

      {/* Questions list */}
      {questions.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Typography variant="subtitle1" fontWeight={600}>
              {questions.length}{isGenerating ? ` de ${genProgress.total}` : ''} questões
            </Typography>
            {blockedCount > 0 && (
              <Chip icon={<ImageIcon fontSize="small" />} label={`${blockedCount} aguardando imagem`} size="small" color="warning" />
            )}
            {doubtCount > 0 && (
              <Chip icon={<WarningAmberIcon fontSize="small" />} label={`${doubtCount} gabarito duvidoso`} size="small" color="warning" variant="outlined" />
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
                  setQuestions((prev) => prev.map((item, j) => (j === idx ? { ...item, unblocked: true } : item)))
                }
                onImageUploaded={(idx, url) =>
                  setQuestions((prev) =>
                    prev.map((item, j) => (j === idx ? { ...item, statementImageUrl: url, unblocked: true } : item))
                  )
                }
              />
            ))}
          </Stack>

          {saveMutation.isError && (
            <Alert severity="error">{(saveMutation.error as Error)?.message ?? 'Erro ao salvar questões'}</Alert>
          )}
          {saveMutation.isSuccess && (
            <Alert severity="success">{questions.length} questões salvas com sucesso!</Alert>
          )}

          <div>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isGenerating || saveMutation.isPending || saveMutation.isSuccess}
              startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
            >
              {saveMutation.isPending ? 'Salvando...' : `Salvar ${questions.length} questões`}
            </Button>
          </div>
        </>
      )}

      <Divider />

      <div>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />} disabled={isGenerating}>
          Voltar para gabarito
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [structuredQuestions, setStructuredQuestions] = useState<ParsedQuestionStructure[]>([])
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})

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

      {step === 1 && (
        <MetadataStep examBaseId={examBaseId} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <ExamPdfStep
          examBaseId={examBaseId}
          onNext={(qs) => { setStructuredQuestions(qs); setStep(3) }}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <GabaritoStep
          examBaseId={examBaseId}
          onNext={(key) => { setAnswerKey(key); setStep(4) }}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <ReviewStep
          examBaseId={examBaseId}
          structuredQuestions={structuredQuestions}
          answerKey={answerKey}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  )
}
