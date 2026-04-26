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
  CircularProgress,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useExtractExamMetadataMutation, useSetPublishedMutation } from '@/features/examBase/queries/examBase.queries'
import { examBaseService } from '@/features/examBase/services/examBase.service'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import type { ExamBase, ExtractedExamMetadata } from '@/features/examBase/domain/examBase.types'
import {
  useCreateExamBaseAttemptMutation,
  useExamBaseAttemptHistoryQuery,
  useAdminExamBaseAttemptsQuery,
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
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { formatBRL, formatExamBaseTitle } from '@/lib/utils'
import { StateCitySelect } from '@/components/StateCitySelect'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { StartExamDialog } from '@/components/StartExamDialog'
import { MobileCard } from '@/ui/mobile'
import { useIsMobile } from '@/lib/useIsMobile'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
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
  if (scope === 'MUNICIPAL') return 'bg-cyan-50 text-cyan-700'
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
  const isMobile = useIsMobile()
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
  const [editVacancyCount, setEditVacancyCount] = useState('')
  const [editApplicantCount, setEditApplicantCount] = useState('')
  const [editRegistrationFee, setEditRegistrationFee] = useState('')
  const [editRegistrationDate, setEditRegistrationDate] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editWorkload, setEditWorkload] = useState('')
  const [isEditingAdminNotes, setIsEditingAdminNotes] = useState(false)
  const [adminNotesDraft, setAdminNotesDraft] = useState('')
  const [isSavingAdminNotes, setIsSavingAdminNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generateSlugLoading, setGenerateSlugLoading] = useState(false)
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const extractMutation = useExtractExamMetadataMutation()
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
  const { data: adminAttempts = [], isLoading: isLoadingAdminAttempts } =
    useAdminExamBaseAttemptsQuery(examBaseId, isAdmin)
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null)

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
      setEditVacancyCount(examBase.vacancyCount != null ? String(examBase.vacancyCount) : '')
      setEditApplicantCount(examBase.applicantCount != null ? String(examBase.applicantCount) : '')
      setEditRegistrationFee(examBase.registrationFee ?? '')
      setEditRegistrationDate(examBase.registrationDate ? isoToDateInput(examBase.registrationDate) : '')
      setEditDescription(examBase.description ?? '')
      setEditWorkload(examBase.workload ?? '')
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
        vacancyCount: editVacancyCount ? parseInt(editVacancyCount, 10) : null,
        applicantCount: editApplicantCount ? parseInt(editApplicantCount, 10) : null,
        registrationFee: editRegistrationFee.trim() || null,
        registrationDate: editRegistrationDate.trim() || null,
        description: editDescription.trim() || null,
        workload: editWorkload.trim() || null,
      })
      await refetchExamBases()
      setIsEditing(false)
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : 'Falha ao atualizar exame')
    } finally {
      setIsSaving(false)
    }
  }

  function applyExtractedToEdit(data: ExtractedExamMetadata) {
    if (data.name) setEditName(data.name)
    if (data.role) setEditRole(data.role)
    if (data.institution) setEditInstitution(data.institution)
    if (data.governmentScope) setEditGovernmentScope(data.governmentScope)
    if (data.state) setEditState(data.state)
    if (data.city) setEditCity(data.city)
    if (data.salaryBase) setEditSalaryBase(data.salaryBase)
    if (data.minPassingGradeNonQuota) setEditMinPassingGradeNonQuota(data.minPassingGradeNonQuota)
    if (data.examDate) setEditExamDate(data.examDate.slice(0, 10))
    if (data.editalUrl) setEditEditalUrl(data.editalUrl)
    if (data.vacancyCount != null) setEditVacancyCount(String(data.vacancyCount))
    if (data.applicantCount != null) setEditApplicantCount(String(data.applicantCount))
    if (data.registrationFee) setEditRegistrationFee(data.registrationFee)
    if (data.registrationDate) setEditRegistrationDate(data.registrationDate.slice(0, 10))
    if (data.description) setEditDescription(data.description)
    if (data.workload) setEditWorkload(data.workload)
  }

  async function handleExtractInEdit() {
    if (!editPdfFile) return
    const data = await extractMutation.mutateAsync({
      role: editRole.trim() || undefined,
      pdfFile: editPdfFile,
    })
    applyExtractedToEdit(data)
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
        : 'text-rose-600'

  const pageTitle = examBase
    ? formatExamBaseTitle(examBase)
    : 'Exame'
  const questionCount = examBase?._count?.questions ?? 0

  if (isMobile && !isEditing) {
    const startCtaLabel = createAttempt.isPending ? 'Iniciando…' : 'Iniciar prova'
    return (
      <div
        className="flex flex-col gap-4"
        style={{
          paddingBottom:
            'calc(var(--mobile-bottom-nav-height) + var(--safe-area-inset-bottom) + 4.5rem)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/exams"
            search={{ board: undefined }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 no-underline shadow-sm ring-1 ring-slate-200"
            aria-label="Voltar"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          {isAdmin && examBase ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Editar
            </button>
          ) : null}
        </div>

        <MobileCard>
          <div className="flex items-start gap-3">
            {examBase?.examBoard?.logoUrl ? (
              <img
                src={examBase.examBoard.logoUrl}
                alt={examBase.examBoard.alias ?? examBase.examBoard.name ?? ''}
                className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                <DocumentTextIcon className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold leading-snug text-slate-900">
                {pageTitle}
              </h1>
              {examBase?.role ? (
                <p className="mt-0.5 text-xs text-slate-500">{examBase.role}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {examBase ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${governmentScopeColor(examBase.governmentScope)}`}
              >
                <BuildingLibraryIcon className="h-3 w-3" />
                {governmentScopeLabel(examBase.governmentScope)}
              </span>
            ) : null}
            {examBase?.state || examBase?.city ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                <MapPinIcon className="h-3 w-3" />
                {examBase?.city ? `${examBase.city}/` : ''}
                {examBase?.state ?? ''}
              </span>
            ) : null}
            {questionCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                <DocumentTextIcon className="h-3 w-3" />
                {questionCount}
              </span>
            ) : null}
            {isAdmin && examBase ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                  (examBase.published ?? false)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {(examBase.published ?? false) ? (
                  <GlobeAltIcon className="h-3 w-3" />
                ) : (
                  <EyeSlashIcon className="h-3 w-3" />
                )}
                {(examBase.published ?? false) ? 'Publicado' : 'Rascunho'}
              </span>
            ) : null}
          </div>

          {examBase?.editalUrl ? (
            <a
              href={examBase.editalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 no-underline"
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              Ver edital
            </a>
          ) : null}
        </MobileCard>

        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Última nota
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${lastScoreColorClass}`}>
                {lastScore != null ? `${lastScore.toFixed(0)}%` : '—'}
              </span>
              {hasTrend && trendDiff != null ? (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    trendDiff >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {trendDiff >= 0 ? (
                    <ArrowTrendingUpIcon className="h-3 w-3" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-3 w-3" />
                  )}
                  {trendDiff >= 0 ? '+' : ''}
                  {trendDiff.toFixed(0)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Corte {minPassingDisplay}
            </p>
          </MobileCard>

          <MobileCard className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Salário
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-slate-900">
              {examBase?.salaryBase ? formatBRL(examBase.salaryBase) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {examBase?.examDate
                ? dayjs(examBase.examDate).format('DD/MM/YYYY')
                : '—'}
            </p>
          </MobileCard>
        </div>

        {questionCount > 0 ? (
          <MobileCard>
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4 text-cyan-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Questões por matéria
              </h2>
            </div>
            {isLoadingSubjectStats ? (
              <div className="mt-3 flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 rounded-lg bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : subjectStats.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Nenhuma matéria definida.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {[...subjectStats]
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6)
                  .map(({ subject, count }) => {
                    const pct = (count / questionCount) * 100
                    return (
                      <div key={subject}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-700">
                            {subject}
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
                            {count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-violet-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                {subjectStats.length > 6 ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    +{subjectStats.length - 6} matérias
                  </p>
                ) : null}
              </div>
            )}
          </MobileCard>
        ) : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tentativas {attempts.length > 0 ? `(${attempts.length})` : ''}
            </h2>
          </div>
          {attemptsError ? (
            <MobileCard>
              <p className="text-sm text-rose-600">Erro ao carregar tentativas.</p>
            </MobileCard>
          ) : isLoadingAttempts ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-3xl bg-slate-200/70"
                />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <MobileCard>
              <p className="text-sm text-slate-500">
                Nenhuma tentativa ainda. Toque em &quot;Iniciar prova&quot; para
                começar.
              </p>
            </MobileCard>
          ) : (
            <div className="flex flex-col gap-3">
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
                        className: 'bg-amber-50 text-amber-700',
                      }
                    : item.passed === true
                      ? {
                          label: item.isPartial ? 'Aprovado (parcial)' : 'Aprovado',
                          icon: CheckCircleIcon,
                          className: 'bg-emerald-50 text-emerald-700',
                        }
                      : {
                          label: item.isPartial
                            ? 'Reprovado (parcial)'
                            : 'Reprovado',
                          icon: ExclamationTriangleIcon,
                          className: 'bg-rose-50 text-rose-700',
                        }
                const StatusIcon = status.icon
                const scoreText =
                  item.percentage != null
                    ? `${item.percentage.toFixed(0)}%`
                    : '—'
                const dateText = item.finishedAt
                  ? dayjs(item.finishedAt).format('DD/MM/YY HH:mm')
                  : dayjs(item.startedAt).format('DD/MM/YY HH:mm')

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
                    className={isClickable ? 'cursor-pointer' : ''}
                  >
                    <MobileCard>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                          <span className="text-sm font-bold tabular-nums text-slate-800">
                            {scoreText}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">
                            {dateText}
                          </p>
                        </div>
                        {isClickable ? (
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
                        ) : null}
                      </div>
                    </MobileCard>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="fixed inset-x-0 z-30 px-4"
          style={{
            bottom:
              'calc(var(--mobile-bottom-nav-height) + var(--safe-area-inset-bottom) + 0.5rem)',
          }}
        >
          <button
            type="button"
            onClick={handleOpenStartExam}
            disabled={createAttempt.isPending || !hasAccess}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 text-sm font-semibold text-white shadow-lg shadow-cyan-900/25 transition-all hover:bg-cyan-700 disabled:opacity-50"
          >
            <PlayIcon className="h-5 w-5" />
            {!hasAccess ? 'Assine para iniciar' : startCtaLabel}
          </button>
        </div>

        <StartExamDialog
          open={startExamDialogOpen}
          onClose={() => setStartExamDialogOpen(false)}
          onConfirm={handleStartExam}
          subjectStats={subjectStats}
          isLoading={isLoadingSubjectStats}
          isSubmitting={createAttempt.isPending}
          title="Como deseja fazer a prova?"
          confirmLabel="Iniciar prova"
          fullScreen
        />
      </div>
    )
  }

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
          <div className="absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-cyan-50/20 pointer-events-none" />
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
            {/* AI extraction panel */}
            <div className="mb-5 p-4 rounded-xl border border-dashed border-violet-300 bg-violet-50/40">
              <p className="text-sm font-semibold text-slate-700 mb-2">Extrair com IA</p>
              <p className="text-xs text-slate-500 mb-3">Faça upload do PDF do edital para preencher os campos automaticamente.</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => editFileInputRef.current?.click()}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {editPdfFile ? editPdfFile.name : 'Upload PDF'}
                </Button>
                {editPdfFile && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    onClick={() => { setEditPdfFile(null); if (editFileInputRef.current) editFileInputRef.current.value = '' }}
                  >
                    Remover
                  </button>
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setEditPdfFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={extractMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                  disabled={!editPdfFile || extractMutation.isPending}
                  onClick={handleExtractInEdit}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: 'violet.600', '&:hover': { bgcolor: 'violet.700' } }}
                >
                  {extractMutation.isPending ? 'Extraindo...' : 'Extrair metadados'}
                </Button>
              </div>
              {extractMutation.isError && (
                <Alert severity="error" sx={{ mt: 2, py: 0.5 }}>
                  {(extractMutation.error as Error)?.message ?? 'Erro ao extrair metadados'}
                </Alert>
              )}
              {extractMutation.isSuccess && (
                <Alert severity="success" sx={{ mt: 2, py: 0.5 }}>
                  Metadados extraídos! Revise os campos abaixo.
                </Alert>
              )}
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
                  label="Quantidade de vagas"
                  type="number"
                  value={editVacancyCount}
                  onChange={(e) => setEditVacancyCount(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Quantidade de inscritos"
                  type="number"
                  value={editApplicantCount}
                  onChange={(e) => setEditApplicantCount(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Taxa de inscrição (R$)"
                  type="number"
                  value={editRegistrationFee}
                  onChange={(e) => setEditRegistrationFee(e.target.value)}
                  inputProps={{ step: '0.01', min: 0 }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Carga horária"
                  value={editWorkload}
                  onChange={(e) => setEditWorkload(e.target.value)}
                  placeholder="Ex: 40h semanais"
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Data da inscrição"
                  type="date"
                  value={editRegistrationDate}
                  onChange={(e) => setEditRegistrationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
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
              <TextField
                label="Descrição da vaga"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descrição das atribuições do cargo conforme o edital"
                multiline
                minRows={3}
                maxRows={8}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
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
          <div className="absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-cyan-50/30 pointer-events-none" />
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors shadow-sm"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Ver edital
                </a>
              )}
              {isAdmin && examBase && (
              <>
              {(() => {
                const isPublished = examBase.published ?? false
                const hasUnreviewed = !isPublished &&
                  examBase.reviewStats != null &&
                  examBase.reviewStats.totalCount > 0 &&
                  examBase.reviewStats.reviewedCount < examBase.reviewStats.totalCount
                const pendingCount = hasUnreviewed
                  ? examBase.reviewStats!.totalCount - examBase.reviewStats!.reviewedCount
                  : 0
                const tooltipText = isPublished
                  ? 'Despublicar exame (usuários não poderão vê-lo)'
                  : hasUnreviewed
                    ? `Não é possível publicar: ${pendingCount} questão${pendingCount !== 1 ? 'ões' : ''} ainda não ${pendingCount !== 1 ? 'foram revisadas' : 'foi revisada'}`
                    : 'Publicar exame (usuários poderão vê-lo e fazer provas)'
                return (
                <Tooltip title={tooltipText}>
                  <span>
                  <button
                    type="button"
                    onClick={() =>
                      setPublished.mutate(!isPublished)
                    }
                    disabled={setPublished.isPending || hasUnreviewed}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-sm ${
                      isPublished
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {setPublished.isPending ? (
                      <span className="animate-pulse">…</span>
                    ) : isPublished ? (
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
                  </span>
                </Tooltip>
                )
              })()}
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
                          : 'bg-rose-100 text-rose-700'
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
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <AcademicCapIcon className="w-5 h-5 text-cyan-600" />
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

      {/* Review status (admin only) */}
      {isAdmin && examBase?.reviewStats && examBase.reviewStats.totalCount > 0 && (() => {
        const { reviewedCount, totalCount } = examBase.reviewStats
        const pendingCount = totalCount - reviewedCount
        const allReviewed = reviewedCount === totalCount
        const pct = (reviewedCount / totalCount) * 100
        return (
          <Card
            noElevation
            className={`p-6 border overflow-hidden relative ${
              allReviewed
                ? 'border-green-200 bg-green-50/30'
                : 'border-amber-200 bg-amber-50/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                allReviewed ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                <CheckCircleIcon className={`w-5 h-5 ${allReviewed ? 'text-green-600' : 'text-amber-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Revisão de questões
                    </h2>
                    <p className={`text-sm mt-0.5 ${allReviewed ? 'text-green-600' : 'text-amber-600'}`}>
                      {allReviewed
                        ? 'Todas as questões foram revisadas — pronto para publicar'
                        : `${pendingCount} questão${pendingCount !== 1 ? 'ões' : ''} pendente${pendingCount !== 1 ? 's' : ''} de revisão`}
                    </p>
                  </div>
                  {!allReviewed && (
                    <Link
                      to="/exams/$examBoard/$examId/questoes-v2"
                      params={{ examBoard, examId }}
                      className="no-underline"
                    >
                      <Button
                        variant="contained"
                        size="small"
                        color="warning"
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        Revisar questões
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500">Progresso</span>
                    <span className={`text-xs font-semibold ${allReviewed ? 'text-green-600' : 'text-amber-600'}`}>
                      {reviewedCount}/{totalCount} revisadas ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        allReviewed ? 'bg-green-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )
      })()}

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
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-5 h-5 text-cyan-600" />
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
                            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-violet-500 transition-all duration-500"
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
          <p className="text-sm text-rose-600 mt-4">Erro ao carregar tentativas.</p>
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
                        className: 'text-rose-600 bg-rose-50',
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

      {/* Histórico de tentativas — Admin */}
      {isAdmin && (
        <Card noElevation className="p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-violet-600" />
                Histórico de tentativas (Admin)
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {adminAttempts.length}{' '}
                {adminAttempts.length === 1 ? 'tentativa' : 'tentativas'} de{' '}
                {new Set(adminAttempts.map((a) => a.user.id)).size}{' '}
                {new Set(adminAttempts.map((a) => a.user.id)).size === 1 ? 'aluno' : 'alunos'}
              </p>
            </div>
          </div>

          {isLoadingAdminAttempts && (
            <div className="flex items-center gap-2 mt-4">
              <CircularProgress size={16} />
              <span className="text-sm text-slate-500">Carregando…</span>
            </div>
          )}

          {!isLoadingAdminAttempts && adminAttempts.length === 0 && (
            <p className="text-sm text-slate-500 mt-4">
              Nenhuma tentativa realizada nesta prova.
            </p>
          )}

          {!isLoadingAdminAttempts && adminAttempts.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {adminAttempts.map((attempt) => {
                const isExpanded = expandedAttemptId === attempt.id
                const userName = attempt.user.email
                const status =
                  attempt.finishedAt == null
                    ? { label: 'Em andamento', className: 'text-amber-600 bg-amber-50', Icon: ClockIcon }
                    : attempt.scorePercentage != null &&
                        examBase?.minPassingGradeNonQuota != null &&
                        attempt.scorePercentage >= Number(examBase.minPassingGradeNonQuota)
                      ? { label: attempt.isPartial ? 'Aprovado (parcial)' : 'Aprovado', className: 'text-emerald-600 bg-emerald-50', Icon: CheckCircleIcon }
                      : { label: attempt.isPartial ? 'Reprovado (parcial)' : 'Reprovado', className: 'text-rose-600 bg-rose-50', Icon: ExclamationTriangleIcon }

                const duration =
                  attempt.startedAt && attempt.finishedAt
                    ? (() => {
                        const mins = dayjs(attempt.finishedAt).diff(dayjs(attempt.startedAt), 'minute')
                        const h = Math.floor(mins / 60)
                        const m = mins % 60
                        return h > 0 ? `${h}h ${m}min` : `${m}min`
                      })()
                    : null

                return (
                  <div key={attempt.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    {/* Row header */}
                    <div
                      role="button"
                      onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-4 min-w-0">
                        {/* User */}
                        <div className="flex items-center gap-2 min-w-0">
                          <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]" title={userName}>
                            {userName}
                          </span>
                        </div>
                        {/* Date */}
                        <div className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {dayjs(attempt.startedAt).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>
                        {/* Duration */}
                        {duration && (
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{duration}</span>
                          </div>
                        )}
                        {/* Score */}
                        <div className="flex items-center gap-1.5">
                          <TrophyIcon className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-slate-800">
                            {attempt.scorePercentage != null
                              ? `${attempt.scorePercentage.toFixed(1)}%`
                              : '—'}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({attempt.correctCount}/{attempt.totalQuestions})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          <status.Icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-slate-500 block text-xs">Email</span>
                            <span className="text-slate-800 font-medium">{attempt.user.email}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Início</span>
                            <span className="text-slate-800">{dayjs(attempt.startedAt).format('DD/MM/YYYY HH:mm:ss')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Término</span>
                            <span className="text-slate-800">
                              {attempt.finishedAt ? dayjs(attempt.finishedAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Duração</span>
                            <span className="text-slate-800">{duration ?? '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Respondidas</span>
                            <span className="text-slate-800">{attempt.answeredCount}/{attempt.totalQuestions}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Acertos</span>
                            <span className="text-slate-800">{attempt.correctCount}/{attempt.totalQuestions}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs">Nota</span>
                            <span className="text-slate-800 font-semibold">
                              {attempt.scorePercentage != null ? `${attempt.scorePercentage.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                          {attempt.isPartial && (
                            <div>
                              <span className="text-slate-500 block text-xs">Filtro de matérias</span>
                              <span className="text-slate-800">{attempt.subjectFilter.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Answer grid */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Respostas ({attempt.answers.length})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {attempt.answers.map((ans, idx) => {
                              const bg = ans.selectedAlternativeId == null
                                ? 'bg-slate-200 text-slate-500'
                                : ans.isCorrect
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              return (
                                <Tooltip
                                  key={ans.questionId}
                                  title={
                                    ans.selectedAlternativeId == null
                                      ? `Q${idx + 1}: Não respondida`
                                      : ans.isCorrect
                                        ? `Q${idx + 1}: ${ans.selectedAlternativeKey} (correta)`
                                        : `Q${idx + 1}: ${ans.selectedAlternativeKey} (errada)`
                                  }
                                >
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-semibold ${bg}`}
                                  >
                                    {ans.selectedAlternativeKey ?? '–'}
                                  </span>
                                </Tooltip>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

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
