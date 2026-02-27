import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useSetPublishedMutation } from '@/features/examBase/queries/examBase.queries'
import { examBaseService } from '@/features/examBase/services/examBase.service'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import {
  useCreateExamBaseAttemptMutation,
  useExamBaseAttemptHistoryQuery,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useQuestionsCountBySubjectQuery } from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import { authService } from '@/features/auth/services/auth.service'
import { ApiError } from '@/lib/api'
import { Card } from '@/components/Card'
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrophyIcon,
  GlobeAltIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/solid'
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { formatBRL } from '@/lib/utils'
import { StateCitySelect } from '@/components/StateCitySelect'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { StartExamDialog } from '@/components/StartExamDialog'
import dayjs from 'dayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/',
)({
  component: RouteComponent,
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function governmentScopeLabel(scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') {
  if (scope === 'MUNICIPAL') return 'Municipal'
  if (scope === 'STATE') return 'Estadual'
  return 'Federal'
}

function governmentScopeColor(scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') {
  if (scope === 'MUNICIPAL') return 'bg-blue-50 text-blue-700'
  if (scope === 'STATE') return 'bg-violet-50 text-violet-700'
  return 'bg-amber-50 text-amber-700'
}

function isoToDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  return value
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function RouteComponent() {
  const { examBoard, examId } = Route.useParams()
  const queryClient = useQueryClient()
  const [examBase, setExamBase] = useState<ExamBase | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editGovernmentScope, setEditGovernmentScope] = useState<
    'MUNICIPAL' | 'STATE' | 'FEDERAL'
  >('FEDERAL')
  const [editState, setEditState] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editSalaryBase, setEditSalaryBase] = useState('')
  const [editMinPassingGradeNonQuota, setEditMinPassingGradeNonQuota] =
    useState('')
  const [editExamDate, setEditExamDate] = useState('')
  const [editExamBoardId, setEditExamBoardId] = useState<string>('')
  const [editSlug, setEditSlug] = useState('')
  const [editEditalUrl, setEditEditalUrl] = useState('')
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesDraft, setAdminNotesDraft] = useState('')
  const [isSavingAdminNotes, setIsSavingAdminNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generateSlugLoading, setGenerateSlugLoading] = useState(false)
  const [startExamDialogOpen, setStartExamDialogOpen] = useState(false)

  const examBaseId = examId
  const { examBases } = useExamBaseFacade({ examBoardId: examBoard })
  const { examBoards } = useExamBoardFacade()
  const navigate = useNavigate()
  const createAttempt = useCreateExamBaseAttemptMutation(examBaseId)
  const setPublished = useSetPublishedMutation(examBaseId)
  const { data: attempts = [], isLoading: isLoadingAttempts, error: attemptsError } =
    useExamBaseAttemptHistoryQuery(examBaseId)
  const { data: subjectStats = [], isLoading: isLoadingSubjectStats } =
    useQuestionsCountBySubjectQuery(examBaseId)
  const { hasAccess, requireAccess } = useRequireAccess()
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })

  const isAdmin = profileData?.user?.role === 'ADMIN'

  /** Opens the start exam dialog to choose full exam or subject filter. */
  const handleOpenStartExam = () => {
    if (!requireAccess()) return
    setStartExamDialogOpen(true)
  }

  /** Starts an exam attempt with optional subject filter. */
  const handleStartExam = async (subjectFilter: string[]) => {
    try {
      const attempt = await createAttempt.mutateAsync(subjectFilter)
      setStartExamDialogOpen(false)
      await navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: { examBoard, examId, attemptId: attempt.id },
      })
    } catch {
      // Error can be shown via createAttempt.error or a toast
    }
  }

  async function refetchExamBases() {
    await queryClient.invalidateQueries({ queryKey: ['examBases'] })
  }

  async function handleSaveAdminNotes() {
    if (!examBase) return
    setIsSavingAdminNotes(true)
    try {
      await examBaseService.update(examBase.id, {
        adminNotes: adminNotesDraft.trim() || null,
      })
      await refetchExamBases()
      setIsEditingAdminNotes(false)
    } catch {
      // could add toast
    } finally {
      setIsSavingAdminNotes(false)
    }
  }

  useEffect(() => {
    const eb = examBases?.find((b) => b.id === examBaseId)
    setExamBase(eb ?? null)
  }, [examBases, examBaseId])

  useEffect(() => {
    if (isEditing && examBase) {
      setEditName(examBase.name ?? '')
      setEditRole(examBase.role ?? '')
      setEditInstitution(examBase.institution ?? '')
      setEditGovernmentScope(examBase.governmentScope)
      setEditState(examBase.state ?? '')
      setEditCity(examBase.city ?? '')
      setEditSalaryBase(examBase.salaryBase ?? '')
      setEditMinPassingGradeNonQuota(examBase.minPassingGradeNonQuota ?? '')
      setEditExamDate(isoToDateInput(examBase.examDate))
      setEditExamBoardId(examBase.examBoardId ?? '')
      setEditSlug(examBase.slug ?? '')
      setEditEditalUrl(examBase.editalUrl ?? '')
      setEditError(null)
    }
  }, [isEditing, examBase])

  const canSaveEdit = useMemo(() => {
    if (!editName.trim() || !editRole.trim() || !editExamDate.trim())
      return false
    if (editGovernmentScope === 'MUNICIPAL') {
      return !!editState.trim() && !!editCity.trim()
    }
    if (editGovernmentScope === 'STATE') {
      return !!editState.trim() && !editCity.trim()
    }
    return !editState.trim() && !editCity.trim()
  }, [
    editName,
    editRole,
    editExamDate,
    editGovernmentScope,
    editState,
    editCity,
  ])

  async function handleSaveEdit() {
    if (!examBase) return
    setEditError(null)
    setIsSaving(true)
    try {
      await examBaseService.update(examBase.id, {
        name: editName.trim(),
        role: editRole.trim(),
        institution: editInstitution.trim() || null,
        governmentScope: editGovernmentScope,
        state: editState.trim() ? editState.trim() : null,
        city: editCity.trim() ? editCity.trim() : null,
        salaryBase: editSalaryBase.trim() ? editSalaryBase.trim() : null,
        minPassingGradeNonQuota: editMinPassingGradeNonQuota.trim()
          ? editMinPassingGradeNonQuota.trim()
          : null,
        examDate: dateInputToIso(editExamDate.trim()),
        examBoardId: editExamBoardId || null,
        slug: editSlug.trim() || null,
        editalUrl: editEditalUrl.trim() || null,
      })
      await refetchExamBases()
      setIsEditing(false)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : 'Falha ao atualizar exame')
    } finally {
      setIsSaving(false)
    }
  }

  const finishedAttempts = attempts.filter(
    (a) => a.finishedAt != null && a.percentage != null,
  )
  const lastScore = finishedAttempts[0]?.percentage ?? null
  const previousScore = finishedAttempts[1]?.percentage ?? null
  const trendDiff =
    lastScore != null && previousScore != null ? lastScore - previousScore : null
  const hasTrend = finishedAttempts.length >= 2 && trendDiff != null
  const minPassingDisplay =
    examBase?.minPassingGradeNonQuota != null &&
    examBase.minPassingGradeNonQuota !== ''
      ? `${examBase.minPassingGradeNonQuota}%`
      : '—'
  const minPassingNum =
    examBase?.minPassingGradeNonQuota != null &&
    examBase.minPassingGradeNonQuota !== ''
      ? Number(examBase.minPassingGradeNonQuota)
      : null
  const lastScoreColorClass =
    lastScore == null || minPassingNum == null
      ? 'text-slate-700'
      : lastScore >= minPassingNum
        ? 'text-emerald-600'
        : 'text-red-600'

  const pageTitle = examBase?.institution ?? examBase?.name ?? 'Exame'
  const questionCount = examBase?._count?.questions ?? 0

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/exams"
              className="text-slate-500 hover:text-violet-600 font-medium transition-colors no-underline"
            >
              Exames
            </Link>
          </li>
          <li className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <ChevronRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="text-slate-900 font-semibold truncate" title={pageTitle}>
              {pageTitle}
            </span>
          </li>
        </ol>
      </nav>

      {/* Header card: view or edit mode */}
      {isEditing && isAdmin ? (
        <Card
          noElevation
          className="p-6 border border-violet-200 overflow-hidden relative bg-violet-50/30"
        >
          <div className="absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-indigo-50/20 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Editar exame
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditError(null)
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Cancelar edição"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {editError && (
              <Alert
                severity="error"
                onClose={() => setEditError(null)}
                className="mb-4"
              >
                {editError}
              </Alert>
            )}
            <Stack gap={2.5}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Nome"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Cargo"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="ex: Analista de Sistemas"
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </div>
              <TextField
                label="Instituição"
                value={editInstitution}
                onChange={(e) => setEditInstitution(e.target.value)}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <FormControl size="small" fullWidth sx={{ borderRadius: 2 }}>
                <InputLabel id="edit-scope-label">Âmbito</InputLabel>
                <Select
                  labelId="edit-scope-label"
                  value={editGovernmentScope}
                  label="Âmbito"
                  onChange={(e) => {
                    const v = e.target.value as 'MUNICIPAL' | 'STATE' | 'FEDERAL'
                    setEditGovernmentScope(v)
                    if (v === 'FEDERAL') {
                      setEditState('')
                      setEditCity('')
                    } else if (v === 'STATE') {
                      setEditCity('')
                    }
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="MUNICIPAL">Municipal</MenuItem>
                  <MenuItem value="STATE">Estadual</MenuItem>
                  <MenuItem value="FEDERAL">Federal</MenuItem>
                </Select>
              </FormControl>
              <StateCitySelect
                governmentScope={editGovernmentScope}
                state={editState}
                city={editCity}
                onStateChange={setEditState}
                onCityChange={setEditCity}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Salário base"
                  type="number"
                  value={editSalaryBase}
                  onChange={(e) => setEditSalaryBase(e.target.value)}
                  inputProps={{ step: '0.01', min: 0 }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Nota mínima para passar (%)"
                  type="number"
                  value={editMinPassingGradeNonQuota}
                  onChange={(e) => setEditMinPassingGradeNonQuota(e.target.value)}
                  placeholder="ex: 60"
                  inputProps={{ step: '0.01', min: 0, max: 100 }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Data do exame"
                  type="date"
                  value={editExamDate}
                  onChange={(e) => setEditExamDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              <div className="w-full">
                <div className="flex gap-2 w-full">
                  <TextField
                    label="Slug (URL)"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="ex: cebraspe-sp-sao-paulo-2026-enfermeiro"
                    size="small"
                    fullWidth
                    sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      if (!examBase) return
                      setGenerateSlugLoading(true)
                      try {
                        const { slug } = await examBaseService.generateSlug(examBase.id)
                        setEditSlug(slug)
                        await refetchExamBases()
                      } finally {
                        setGenerateSlugLoading(false)
                      }
                    }}
                    disabled={generateSlugLoading}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, flexShrink: 0 }}
                  >
                    {generateSlugLoading ? '…' : 'Gerar slug'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Usado na página pública de concursos.</p>
              </div>
              <TextField
                label="URL do edital"
                value={editEditalUrl}
                onChange={(e) => setEditEditalUrl(e.target.value)}
                placeholder="https://exemplo.gov.br/edital.pdf"
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <FormControl size="small" fullWidth sx={{ borderRadius: 2 }}>
                  <InputLabel id="edit-exam-board-label">Banca</InputLabel>
                  <Select
                    labelId="edit-exam-board-label"
                    value={editExamBoardId}
                    label="Banca"
                    onChange={(e) => setEditExamBoardId(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Nenhuma</MenuItem>
                    {(examBoards ?? []).map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        <Tooltip title={b.name} placement="right">
                          <span>{b.alias ?? b.name}</span>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditing(false)
                    setEditError(null)
                  }}
                  disabled={isSaving}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={!canSaveEdit || isSaving}
                  startIcon={<PencilSquareIcon className="w-4 h-4" />}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {isSaving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </Stack>
          </div>
        </Card>
      ) : (
        <Card
          noElevation
          className="p-6 border border-slate-200 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-indigo-50/30 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="flex items-start gap-4 min-w-0">
              {examBase?.examBoard?.logoUrl && (
                <Tooltip title={examBase.examBoard.name ?? ''}>
                  <img
                    src={examBase.examBoard.logoUrl}
                    alt={examBase.examBoard.alias ?? examBase.examBoard.name ?? ''}
                    className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white p-2 shrink-0 shadow-sm"
                  />
                </Tooltip>
              )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">
                {pageTitle}
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">{examBase?.role}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {examBase && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${governmentScopeColor(examBase.governmentScope)}`}
                  >
                    <BuildingLibraryIcon className="w-3.5 h-3.5" />
                    {governmentScopeLabel(examBase.governmentScope)}
                  </span>
                )}
                {(examBase?.state || examBase?.city) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {examBase?.city ? `${examBase.city} / ` : ''}
                    {examBase?.state ?? ''}
                  </span>
                )}
                {questionCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    {questionCount} questões
                  </span>
                )}
                {examBase?.slug && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600" title="Slug para página pública">
                    /{examBase.slug}
                  </span>
                )}
                {isAdmin && examBase && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      (examBase.published ?? false)
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {(examBase.published ?? false) ? (
                      <GlobeAltIcon className="w-3.5 h-3.5" />
                    ) : (
                      <EyeSlashIcon className="w-3.5 h-3.5" />
                    )}
                    {(examBase.published ?? false) ? 'Publicado' : 'Rascunho'}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(examBase?.editalUrl || (isAdmin && examBase)) && (
            <div className="sm:ml-auto shrink-0 flex flex-wrap items-center gap-2">
              {examBase?.editalUrl && (
                <a
                  href={examBase.editalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Ver edital
                </a>
              )}
              {isAdmin && examBase && (
              <>
              <Tooltip
                title={
                  (examBase.published ?? false)
                    ? 'Despublicar exame (usuários não poderão vê-lo)'
                    : 'Publicar exame (usuários poderão vê-lo e fazer provas)'
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setPublished.mutate(!(examBase.published ?? false))
                  }
                  disabled={setPublished.isPending}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm ${
                    (examBase.published ?? false)
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {setPublished.isPending ? (
                    <span className="animate-pulse">…</span>
                  ) : (examBase.published ?? false) ? (
                    <>
                      <EyeSlashIcon className="w-4 h-4" />
                      Despublicar
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="w-4 h-4" />
                      Publicar
                    </>
                  )}
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer shadow-sm"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Editar
              </button>
              </>
              )}
            </div>
          )}
        </div>
      </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          noElevation
          className="p-5 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <TrophyIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Última nota</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-2xl font-bold ${lastScoreColorClass}`}>
                  {lastScore != null ? `${lastScore.toFixed(1)}%` : '—'}
                </span>
                {hasTrend && (
                  <Tooltip
                    title={
                      trendDiff >= 0
                        ? `Melhorou ${trendDiff.toFixed(1)}% em relação à tentativa anterior`
                        : `Caiu ${Math.abs(trendDiff).toFixed(1)}% em relação à tentativa anterior`
                    }
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                        trendDiff >= 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {trendDiff >= 0 ? (
                        <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                      )}
                      {trendDiff >= 0 ? '+' : ''}
                      {trendDiff.toFixed(1)}%
                    </span>
                  </Tooltip>
                )}
              </div>
              <Tooltip title="Nota mínima para aprovação (ampla concorrência)">
                <p className="text-xs text-slate-500 mt-1 cursor-help">
                  Corte: {minPassingDisplay}
                </p>
              </Tooltip>
            </div>
          </div>
        </Card>

        <Card
          noElevation
          className="p-5 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <AcademicCapIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Banca</p>
              <Tooltip title={examBase?.examBoard?.name ?? ''}>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 cursor-default">
                  {examBase?.examBoard?.alias ?? examBase?.examBoard?.name ?? '—'}
                </p>
              </Tooltip>
            </div>
          </div>
        </Card>

        <Card
          noElevation
          className="p-5 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <BanknotesIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Salário base</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {examBase?.salaryBase
                  ? formatBRL(examBase.salaryBase)
                  : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card
          noElevation
          className="p-5 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <CalendarDaysIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Data do exame</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {examBase?.examDate
                  ? dayjs(examBase.examDate).format('DD/MM/YYYY')
                  : '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notas internas (só para admins) */}
      {isAdmin && (
        <Card noElevation className="p-6 border border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <PencilSquareIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notas internas
                </h2>
                <p className="text-sm text-slate-500">
                  Visível apenas para administradores
                </p>
              </div>
            </div>
            {!isEditingAdminNotes && (
              <button
                type="button"
                onClick={() => {
                  setAdminNotesDraft(examBase?.adminNotes ?? '')
                  setIsEditingAdminNotes(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors cursor-pointer"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>
          {isEditingAdminNotes ? (
            <div className="flex flex-col gap-3">
              <TextField
                value={adminNotesDraft}
                onChange={(e) => setAdminNotesDraft(e.target.value)}
                placeholder="Ex: Ainda não foi disponibilizado o PDF da prova..."
                multiline
                minRows={3}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setIsEditingAdminNotes(false)
                    setAdminNotesDraft('')
                  }}
                  disabled={isSavingAdminNotes}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveAdminNotes}
                  disabled={isSavingAdminNotes}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {isSavingAdminNotes ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : examBase?.adminNotes ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {examBase.adminNotes}
            </p>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Nenhuma nota. Clique em Editar para adicionar.
            </p>
          )}
        </Card>
      )}

      {/* Questões por matéria */}
      {questionCount > 0 && (
        <Card noElevation className="p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Questões por matéria
              </h2>
              <p className="text-sm text-slate-500">
                {questionCount} {questionCount === 1 ? 'questão' : 'questões'} no total
              </p>
            </div>
          </div>
          {isLoadingSubjectStats ? (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : subjectStats.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma questão com matéria definida.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...subjectStats]
                .sort((a, b) => b.count - a.count)
                .map(({ subject, count }) => {
                  const pct =
                    questionCount > 0 ? (count / questionCount) * 100 : 0
                  return (
                    <div
                      key={subject}
                      className="flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {subject}
                          </span>
                          <span className="text-sm font-semibold text-slate-600 tabular-nums shrink-0">
                            {count} {count === 1 ? 'questão' : 'questões'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>
      )}

      {/* Tentativas */}
      <Card noElevation className="p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tentativas</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {attempts.length} {attempts.length === 1 ? 'tentativa' : 'tentativas'}
            </p>
          </div>
          <Tooltip title={!hasAccess ? 'Assine um plano para iniciar provas' : ''}>
            <span>
              <Button
                variant="contained"
                size="medium"
                startIcon={<PlayArrowIcon />}
                onClick={handleOpenStartExam}
                disabled={createAttempt.isPending || !hasAccess}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                {createAttempt.isPending ? 'Iniciando…' : 'Iniciar prova'}
              </Button>
            </span>
          </Tooltip>
        </div>

        {attemptsError && (
          <p className="text-sm text-red-600 mt-4">Erro ao carregar tentativas.</p>
        )}
        {isLoadingAttempts && (
          <p className="text-sm text-slate-500 mt-4">Carregando…</p>
        )}
        {!isLoadingAttempts && !attemptsError && attempts.length === 0 && (
          <p className="text-sm text-slate-500 mt-4">
            Nenhuma tentativa ainda. Clique em &quot;Iniciar prova&quot; para começar.
          </p>
        )}
        {!isLoadingAttempts && !attemptsError && attempts.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            {attempts.map((item: ExamBaseAttemptHistoryItem) => {
              const path = item.finishedAt
                ? '/exams/$examBoard/$examId/$attemptId/feedback'
                : '/exams/$examBoard/$examId/$attemptId'
              const isClickable = item.examBoardId != null
              const status =
                item.finishedAt == null
                  ? {
                      label: 'Em andamento',
                      icon: ClockIcon,
                      className: 'text-amber-600 bg-amber-50',
                    }
                  : item.passed === true
                    ? {
                        label: item.isPartial ? 'Aprovado (parcial)' : 'Aprovado',
                        icon: CheckCircleIcon,
                        className: 'text-emerald-600 bg-emerald-50',
                      }
                    : {
                        label: item.isPartial ? 'Reprovado (parcial)' : 'Reprovado',
                        icon: ExclamationTriangleIcon,
                        className: 'text-red-600 bg-red-50',
                      }
              const StatusIcon = status.icon
              return (
                <div
                  key={item.id}
                  role={isClickable ? 'button' : undefined}
                  onClick={() =>
                    isClickable &&
                    navigate({
                      to: path,
                      params: { examBoard, examId, attemptId: item.id },
                    } as any)
                  }
                  className={`
                    flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4
                    transition-all duration-200
                    ${isClickable ? 'cursor-pointer hover:bg-slate-50 hover:border-slate-300' : ''}
                  `}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <Tooltip
                      title={
                        item.finishedAt
                          ? dayjs(item.finishedAt).format('DD/MM/YYYY HH:mm')
                          : dayjs(item.startedAt).format('DD/MM/YYYY HH:mm')
                      }
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {item.finishedAt
                            ? dayjs(item.finishedAt).format('DD/MM/YYYY HH:mm')
                            : dayjs(item.startedAt).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-800">
                        {item.percentage != null
                          ? `${item.percentage.toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${status.className}`}
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

      <StartExamDialog
        open={startExamDialogOpen}
        onClose={() => setStartExamDialogOpen(false)}
        onConfirm={handleStartExam}
        subjectStats={subjectStats}
        isLoading={isLoadingSubjectStats}
        isSubmitting={createAttempt.isPending}
        title="Como deseja fazer a prova?"
        confirmLabel="Iniciar prova"
      />

      {/* Gerenciar questões (Admin) */}
      {isAdmin && (
        <Card noElevation className="p-4 border border-slate-200">
          <div className="flex flex-col gap-2">
            <Link
              to="/exams/$examBoard/$examId/questoes"
              params={{ examBoard, examId }}
              className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium no-underline"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Gerenciar questões (Accordions)
            </Link>
            <Link
              to="/exams/$examBoard/$examId/questoes-v2"
              params={{ examBoard, examId }}
              className="inline-flex items-center gap-2 text-violet-700 hover:text-violet-900 font-medium no-underline"
            >
              <PlayIcon className="w-5 h-5" />
              Gerenciar questões v2 (Player)
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
