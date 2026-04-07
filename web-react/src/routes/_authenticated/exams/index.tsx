import { Card } from '@/components/Card'
import { PageHero } from '@/components/PageHero'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useCreateDraftExamBaseMutation, useDeleteExamBaseMutation } from '@/features/examBase/queries/examBase.queries'
import { examBaseService } from '@/features/examBase/services/examBase.service'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import { authService } from '@/features/auth/services/auth.service'
import { ApiError } from '@/lib/api'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { fetchEstados, type IbgeEstado } from '@/lib/ibge'
import { formatBRL, formatExamBaseTitle } from '@/lib/utils'
import dayjs from 'dayjs'
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  BanknotesIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  TrophyIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeSlashIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  Alert,
  Autocomplete,
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
  Tooltip,
} from '@mui/material'
import { PpTooltip } from '@/components/PpTooltip'
import { StateCitySelect } from '@/components/StateCitySelect'

function dateInputToIso(value: string) {
  return value
}

export const Route = createFileRoute('/_authenticated/exams/')({
  validateSearch: (search: Record<string, unknown>) => ({
    board: typeof search.board === 'string' ? search.board : undefined,
  }),
  component: ExamsPage,
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bandeiras dos estados brasileiros via IBGE CDN (formato SVG).
 * Fonte: https://www.ibge.gov.br/ — emblemas oficiais.
 */
const STATE_FLAGS: Record<string, string> = {
  AC: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Bandeira_do_Acre.svg',
  AL: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Bandeira_de_Alagoas.svg',
  AP: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Bandeira_do_Amap%C3%A1.svg',
  AM: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Bandeira_do_Amazonas.svg',
  BA: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Bandeira_da_Bahia.svg',
  CE: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Bandeira_do_Cear%C3%A1.svg',
  DF: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Bandeira_do_Distrito_Federal_%28Brasil%29.svg',
  ES: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Bandeira_do_Esp%C3%ADrito_Santo.svg',
  GO: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Flag_of_Goi%C3%A1s.svg',
  MA: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Bandeira_do_Maranh%C3%A3o.svg',
  MT: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Bandeira_de_Mato_Grosso.svg',
  MS: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Bandeira_de_Mato_Grosso_do_Sul.svg',
  MG: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Bandeira_de_Minas_Gerais.svg',
  PA: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Bandeira_do_Par%C3%A1.svg',
  PB: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Bandeira_da_Para%C3%ADba.svg',
  PR: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Bandeira_do_Paran%C3%A1.svg',
  PE: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Bandeira_de_Pernambuco.svg',
  PI: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Bandeira_do_Piau%C3%AD.svg',
  RJ: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Bandeira_do_estado_do_Rio_de_Janeiro.svg',
  RN: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Bandeira_do_Rio_Grande_do_Norte.svg',
  RS: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Bandeira_do_Rio_Grande_do_Sul.svg',
  RO: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Bandeira_de_Rond%C3%B4nia.svg',
  RR: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Bandeira_de_Roraima.svg',
  SC: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Bandeira_de_Santa_Catarina.svg',
  SP: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg',
  SE: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Bandeira_de_Sergipe.svg',
  TO: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Bandeira_do_Tocantins.svg',
}

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

/* ------------------------------------------------------------------ */
/*  Filter Autocomplete                                                */
/* ------------------------------------------------------------------ */

type FilterOption = { value: string; label: string; count?: number; icon?: string }

function FilterAutocomplete({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  const selected = options.find((o) => o.value === value) ?? null

  return (
    <Autocomplete<FilterOption>
      size="small"
      options={options}
      value={selected}
      onChange={(_, opt) => onChange(opt?.value ?? '')}
      getOptionLabel={(opt) =>
        opt.count != null ? `${opt.label} (${opt.count})` : opt.label
      }
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      renderOption={(props, opt) => (
        <li {...props} key={opt.value}>
          <div className="flex items-center gap-2 w-full">
            {opt.icon && (
              <img
                src={opt.icon}
                alt=""
                className="w-5 h-4 object-cover rounded-sm shrink-0"
              />
            )}
            <span className="truncate">{opt.label}</span>
            {opt.count != null && (
              <span className="ml-auto text-xs text-slate-400 shrink-0">{opt.count}</span>
            )}
          </div>
        </li>
      )}
      renderInput={(params) => {
        const selOpt = selected
        return (
          <TextField
            {...params}
            label={label}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: selOpt?.icon ? (
                  <img
                    src={selOpt.icon}
                    alt=""
                    className="w-5 h-4 object-cover rounded-sm shrink-0 ml-1"
                  />
                ) : undefined,
              },
            }}
          />
        )
      }}
      sx={{ minWidth: 180 }}
      noOptionsText="Nenhuma opção"
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Exam Row                                                           */
/* ------------------------------------------------------------------ */

function scoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700'
  if (score >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-600'
}

function ExamRow({
  exam,
  isAdmin,
  animDelay = 0,
  onDelete,
}: {
  exam: ExamBase
  isAdmin?: boolean
  animDelay?: number
  onDelete?: (exam: ExamBase) => void
}) {
  const questionCount = exam._count?.questions ?? 0
  const hasAttempts = (exam.userStats?.attemptCount ?? 0) > 0
  const bestScore = exam.userStats?.bestScore
  const canNavigate = Boolean(exam.examBoardId)

  const content = (
    <div
      className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
      style={{ animation: `fade-in-up 0.35s ease-out ${animDelay}ms both` }}
    >
      {/* Score badge — most actionable info, visible first */}
      <div className="w-11 h-11 shrink-0 flex items-center justify-center">
        {hasAttempts && bestScore != null ? (
          <Tooltip title={`Melhor nota · ${exam.userStats!.attemptCount} tentativa${exam.userStats!.attemptCount !== 1 ? 's' : ''}`}>
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center ${scoreColor(bestScore)}`}>
              <span className="text-sm font-bold tabular-nums leading-none">{bestScore.toFixed(0)}%</span>
            </div>
          </Tooltip>
        ) : exam.examBoard?.logoUrl ? (
          <Tooltip title={exam.examBoard.name ?? ''}>
            <img
              src={exam.examBoard.logoUrl}
              alt={exam.examBoard.alias ?? exam.examBoard.name ?? ''}
              className="w-10 h-10 object-contain rounded-lg"
            />
          </Tooltip>
        ) : (
          <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-slate-300" />
          </div>
        )}
      </div>

      {/* Main content — 2 lines */}
      <div className="min-w-0 flex-1">
        {/* Line 1: Title · Board · Date */}
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {formatExamBaseTitle(exam)}
          </p>
          {exam.examBoard && (
            <span className="hidden sm:inline shrink-0 text-[0.65rem] text-slate-400 font-medium">
              · {exam.examBoard.alias ?? exam.examBoard.name}
            </span>
          )}
          <span className="hidden sm:inline shrink-0 text-[0.65rem] text-slate-400">
            · {dayjs(exam.examDate).format('MMM/YYYY')}
          </span>
        </div>

        {/* Line 2: meta pills */}
        <div className="flex items-center gap-1.5 mt-0.5">
            {isAdmin && !(exam.published ?? true) && (
              <span className="inline-flex items-center gap-1 text-[0.6rem] font-medium px-1.5 py-px rounded-full bg-amber-100 text-amber-800">
                <EyeSlashIcon className="w-2.5 h-2.5" />
                Rascunho
              </span>
            )}
            <span
              className={`inline-flex items-center text-[0.6rem] font-medium px-1.5 py-px rounded-full ${governmentScopeColor(exam.governmentScope)}`}
            >
              {governmentScopeLabel(exam.governmentScope)}
            </span>
            {(exam.state || exam.city) && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[0.6rem] font-medium px-1.5 py-px rounded-full bg-slate-100 text-slate-500">
                <MapPinIcon className="w-2.5 h-2.5" />
                {exam.city ? `${exam.city}/${exam.state}` : exam.state}
              </span>
            )}
        </div>
      </div>

      {/* Right side stats */}
      <div className="hidden sm:flex items-center gap-4 shrink-0">
        {/* Questions */}
        <Tooltip title="Questões">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="tabular-nums">{questionCount}</span>
          </div>
        </Tooltip>

        {/* Salary */}
        {exam.salaryBase && (
          <Tooltip title="Salário base">
            <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500">
              <BanknotesIcon className="w-3.5 h-3.5 text-slate-400" />
              {formatBRL(exam.salaryBase)}
            </div>
          </Tooltip>
        )}

        {/* Attempts */}
        {hasAttempts && (
          <Tooltip title="Tentativas">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ArrowPathIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="tabular-nums">{exam.userStats!.attemptCount}x</span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* Admin review progress */}
      {isAdmin && exam.reviewStats && exam.reviewStats.totalCount > 0 && (
        <Tooltip title={`${exam.reviewStats.reviewedCount}/${exam.reviewStats.totalCount} revisadas`}>
          <div className="hidden md:flex items-center shrink-0 w-14">
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${exam.reviewStats.reviewedCount === exam.reviewStats.totalCount ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${(exam.reviewStats.reviewedCount / exam.reviewStats.totalCount) * 100}%` }}
              />
            </div>
          </div>
        </Tooltip>
      )}

      {/* Admin delete */}
      {isAdmin && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(exam)
          }}
          className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
          aria-label="Excluir exame"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}

      <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  )

  if (canNavigate) {
    return (
      <Link
        to="/exams/$examBoard/$examId"
        params={{ examBoard: exam.examBoardId!, examId: exam.id }}
        className="block no-underline text-inherit"
      >
        {content}
      </Link>
    )
  }
  return content
}

/* ------------------------------------------------------------------ */
/*  Create Exam Dialog (Admin only)                                    */
/* ------------------------------------------------------------------ */

function CreateExamDialog({
  open,
  onClose,
  examBoards,
  examBases,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  examBoards: Array<{ id: string; name: string; alias?: string | null }>
  examBases: ExamBase[] | undefined
  onSuccess: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<ExamBase[]>([])
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState('')
  const [createInstitution, setCreateInstitution] = useState('')
  const [createGovernmentScope, setCreateGovernmentScope] = useState<
    'MUNICIPAL' | 'STATE' | 'FEDERAL'
  >('FEDERAL')
  const [createState, setCreateState] = useState('')
  const [createCity, setCreateCity] = useState('')
  const [createSalaryBase, setCreateSalaryBase] = useState('')
  const [createMinPassingGradeNonQuota, setCreateMinPassingGradeNonQuota] =
    useState('')
  const [createExamDate, setCreateExamDate] = useState('')
  const [createExamBoardId, setCreateExamBoardId] = useState<string>('')

  const canCreate = useMemo(() => {
    if (!createName.trim() || !createRole.trim() || !createExamDate.trim())
      return false
    if (createGovernmentScope === 'MUNICIPAL') {
      return !!createState.trim() && !!createCity.trim()
    }
    if (createGovernmentScope === 'STATE') {
      return !!createState.trim() && !createCity.trim()
    }
    return !createState.trim() && !createCity.trim()
  }, [
    createName,
    createRole,
    createExamDate,
    createGovernmentScope,
    createState,
    createCity,
  ])

  function resetForm() {
    setCreateName('')
    setCreateRole('')
    setCreateInstitution('')
    setCreateGovernmentScope('FEDERAL')
    setCreateState('')
    setCreateCity('')
    setCreateSalaryBase('')
    setCreateMinPassingGradeNonQuota('')
    setCreateExamDate('')
    setCreateExamBoardId('')
    setError(null)
    setDuplicates([])
  }

  async function doCreate() {
    setError(null)
    try {
      await examBaseService.create({
        name: createName.trim(),
        role: createRole.trim(),
        institution: createInstitution.trim() || undefined,
        governmentScope: createGovernmentScope,
        state: createState.trim() ? createState.trim() : null,
        city: createCity.trim() ? createCity.trim() : null,
        salaryBase: createSalaryBase.trim() ? createSalaryBase.trim() : null,
        minPassingGradeNonQuota: createMinPassingGradeNonQuota.trim()
          ? createMinPassingGradeNonQuota.trim()
          : null,
        examDate: dateInputToIso(createExamDate.trim()),
        examBoardId: createExamBoardId || undefined,
      })
      resetForm()
      onClose()
      onSuccess()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao criar exame')
    }
  }

  async function handleCreate() {
    if (duplicates.length > 0) {
      await doCreate()
      return
    }

    const city = createCity.trim().toLowerCase()
    const year = createExamDate ? new Date(createExamDate).getFullYear() : null

    if (city && year && examBases) {
      const matches = examBases.filter((eb) => {
        const ebCity = eb.city?.trim().toLowerCase()
        const ebYear = eb.examDate ? new Date(eb.examDate).getFullYear() : null
        return ebCity === city && ebYear === year
      })
      if (matches.length > 0) {
        setDuplicates(matches)
        return
      }
    }

    await doCreate()
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Criar exame</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {duplicates.length > 0 && (
            <Alert severity="warning" onClose={() => setDuplicates([])}>
              <strong>Já existe(m) exame(s) para essa cidade e ano:</strong>
              <ul className="mt-1 mb-0 pl-4 list-disc">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/exams/editar/$examBaseId"
                      params={{ examBaseId: d.id }}
                      className="text-violet-600 underline hover:text-violet-800"
                    >
                      {formatExamBaseTitle(d)}
                    </Link>
                  </li>
                ))}
              </ul>
              <span className="text-sm">Clique em &quot;Criar mesmo assim&quot; para continuar.</span>
            </Alert>
          )}
          <TextField
            label="Nome"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Cargo"
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value)}
            placeholder="ex: Analista de Sistemas"
            fullWidth
          />
          <TextField
            label="Instituição"
            value={createInstitution}
            onChange={(e) => setCreateInstitution(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="create-scope-label">Âmbito</InputLabel>
            <Select
              labelId="create-scope-label"
              value={createGovernmentScope}
              label="Âmbito"
              onChange={(e) => {
                const v = e.target.value as 'MUNICIPAL' | 'STATE' | 'FEDERAL'
                setCreateGovernmentScope(v)
                setDuplicates([])
                if (v === 'FEDERAL') {
                  setCreateState('')
                  setCreateCity('')
                } else if (v === 'STATE') {
                  setCreateCity('')
                }
              }}
            >
              <MenuItem value="MUNICIPAL">Municipal</MenuItem>
              <MenuItem value="STATE">Estadual</MenuItem>
              <MenuItem value="FEDERAL">Federal</MenuItem>
            </Select>
          </FormControl>
          <StateCitySelect
            governmentScope={createGovernmentScope}
            state={createState}
            city={createCity}
            onStateChange={(v) => { setCreateState(v); setDuplicates([]) }}
            onCityChange={(v) => { setCreateCity(v); setDuplicates([]) }}
            fullWidth
          />
          <TextField
            label="Salário base"
            type="number"
            value={createSalaryBase}
            onChange={(e) => setCreateSalaryBase(e.target.value)}
            inputProps={{ step: '0.01', min: 0 }}
            fullWidth
          />
          <TextField
            label="Nota mínima para passar (%)"
            type="number"
            value={createMinPassingGradeNonQuota}
            onChange={(e) => setCreateMinPassingGradeNonQuota(e.target.value)}
            placeholder="ex: 60"
            inputProps={{ step: '0.01', min: 0, max: 100 }}
            fullWidth
          />
          <TextField
            label="Data do exame"
            type="date"
            value={createExamDate}
            onChange={(e) => { setCreateExamDate(e.target.value); setDuplicates([]) }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="create-exam-board-label">Banca</InputLabel>
            <Select
              labelId="create-exam-board-label"
              value={createExamBoardId}
              label="Banca"
              onChange={(e) => setCreateExamBoardId(e.target.value)}
            >
              <MenuItem value="">Nenhuma</MenuItem>
              {examBoards.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  <Tooltip title={b.name} placement="right">
                    <span>{b.alias ?? b.name}</span>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate}
          color={duplicates.length > 0 ? 'warning' : 'primary'}
          startIcon={<PlusIcon className="w-4 h-4" />}
        >
          {duplicates.length > 0 ? 'Criar mesmo assim' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function ExamsPage() {
  const queryClient = useQueryClient()
  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade()
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })

  const isAdmin = profileData?.user?.role === 'ADMIN'
  const navigate = useNavigate()
  const { board: boardFromUrl } = Route.useSearch()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const createDraftMutation = useCreateDraftExamBaseMutation()
  const deleteMutation = useDeleteExamBaseMutation()
  const [examToDelete, setExamToDelete] = useState<ExamBase | null>(null)

  async function handleCreateExam() {
    const { id } = await createDraftMutation.mutateAsync()
    navigate({ to: '/exams/editar/$examBaseId', params: { examBaseId: id }, search: { board: undefined } })
  }
  const [search, setSearch] = useState('')
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    boardFromUrl ?? null,
  )
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  useEffect(() => {
    setSelectedBoardId(boardFromUrl ?? null)
  }, [boardFromUrl])

  function setBoardFilter(boardId: string | null) {
    setSelectedBoardId(boardId)
    navigate({
      to: '/exams',
      search: { board: boardId ?? undefined },
      replace: true,
    })
  }

  async function refetchExamBases() {
    await queryClient.invalidateQueries({ queryKey: ['examBases'] })
  }

  const { data: ibgeEstados = [] } = useQuery({
    queryKey: ['ibge', 'estados'],
    queryFn: fetchEstados,
    staleTime: 1000 * 60 * 60 * 24,
  })

  // Filter options derived from data
  const stateOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const eb of examBases ?? []) {
      if (eb.state) {
        map.set(eb.state, (map.get(eb.state) ?? 0) + 1)
      }
    }
    const siglaToEstado = new Map<string, IbgeEstado>()
    for (const e of ibgeEstados) siglaToEstado.set(e.sigla, e)

    return Array.from(map.entries())
      .sort((a, b) => {
        const nomeA = siglaToEstado.get(a[0])?.nome ?? a[0]
        const nomeB = siglaToEstado.get(b[0])?.nome ?? b[0]
        return nomeA.localeCompare(nomeB)
      })
      .map(([sigla, count]) => {
        const estado = siglaToEstado.get(sigla)
        const nome = estado ? estado.nome : sigla
        return {
          value: sigla,
          label: nome,
          count,
          icon: STATE_FLAGS[sigla],
        }
      })
  }, [examBases, ibgeEstados])

  const cityOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const eb of examBases ?? []) {
      if (eb.city && (!selectedState || eb.state === selectedState)) {
        map.set(eb.city, (map.get(eb.city) ?? 0) + 1)
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([city, count]) => ({ value: city, label: city, count }))
  }, [examBases, selectedState])

  const boardOptions = useMemo(() => {
    const map = new Map<string, { name: string; alias?: string | null; count: number }>()
    for (const eb of examBases ?? []) {
      if (eb.examBoardId && eb.examBoard) {
        const existing = map.get(eb.examBoardId)
        if (existing) {
          existing.count++
        } else {
          map.set(eb.examBoardId, { name: eb.examBoard.name, alias: eb.examBoard.alias, count: 1 })
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[1].alias ?? a[1].name).localeCompare(b[1].alias ?? b[1].name))
      .map(([id, { name, alias, count }]) => ({ value: id, label: alias ?? name, count }))
  }, [examBases])

  // Filtered exams
  const filteredExams = useMemo(() => {
    let list = examBases ?? []

    if (selectedBoardId) {
      list = list.filter((e) => e.examBoardId === selectedBoardId)
    }

    if (selectedState) {
      list = list.filter((e) => e.state === selectedState)
    }

    if (selectedCity) {
      list = list.filter((e) => e.city === selectedCity)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          (e.institution ?? '').toLowerCase().includes(q) ||
          (e.name ?? '').toLowerCase().includes(q) ||
          (e.role ?? '').toLowerCase().includes(q) ||
          (e.state ?? '').toLowerCase().includes(q) ||
          (e.city ?? '').toLowerCase().includes(q) ||
          (e.examBoard?.name ?? '').toLowerCase().includes(q) ||
          (e.examBoard?.alias ?? '').toLowerCase().includes(q),
      )
    }

    return list
  }, [examBases, selectedBoardId, selectedState, selectedCity, search])

  const hasActiveFilters = !!selectedBoardId || !!selectedState || !!selectedCity || !!search

  // Stats
  const totalExams = (examBases ?? []).length
  const totalQuestions = (examBases ?? []).reduce(
    (acc, e) => acc + (e._count?.questions ?? 0),
    0,
  )
  const examsWithAttempts = (examBases ?? []).filter(
    (e) => (e.userStats?.attemptCount ?? 0) > 0,
  ).length

  const totalAttempts = historyItems.length
  const passedAttempts = historyItems.filter((i) => i.passed === true).length
  const failedAttempts = historyItems.filter(
    (i) => i.finishedAt != null && i.passed !== true,
  ).length

  // Taxa de aprovação e evolução
  const { approvalRate, evolutionPp } = useMemo(() => {
    const finished = historyItems
      .filter((i) => i.finishedAt != null)
      .sort(
        (a, b) =>
          new Date(b.finishedAt!).getTime() -
          new Date(a.finishedAt!).getTime(),
      )
    const total = finished.length
    const passed = finished.filter((i) => i.passed === true).length
    const rate = total > 0 ? (passed / total) * 100 : null

    let evolution: number | null = null
    if (total >= 4) {
      const half = Math.floor(total / 2)
      const recent = finished.slice(0, half)
      const older = finished.slice(half)
      const recentRate =
        recent.length > 0
          ? (recent.filter((i) => i.passed === true).length / recent.length) *
            100
          : 0
      const olderRate =
        older.length > 0
          ? (older.filter((i) => i.passed === true).length / older.length) *
            100
          : 0
      evolution = recentRate - olderRate
    }

    return {
      approvalRate: rate,
      evolutionPp: evolution,
    }
  }, [historyItems])

  const isLoading = isLoadingExamBases || isLoadingExamBoards

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* ═══════════ HERO ═══════════ */}
      <PageHero
        title="Exames"
        description="Explore simulados de concursos, pratique e acompanhe sua evolução."
        variant="violet"
        animation="scale-in 0.45s ease-out both"
        // padding="px-6 py-8 md:px-8 md:py-10"
      >
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : totalExams}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Provas
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading
                ? '—'
                : totalQuestions > 999
                  ? `${(totalQuestions / 1000).toFixed(1)}k`
                  : totalQuestions}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Questões
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : examsWithAttempts}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Praticados
            </p>
          </div>
        </div>
      </PageHero>

      {/* ═══════════ RESUMO DE TENTATIVAS + TAXA DE APROVAÇÃO ═══════════ */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ animation: 'fade-in-up 0.5s ease-out 80ms both' }}
      >
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Suas tentativas
            </h3>
            <Link
              to="/history"
              className="text-xs text-cyan-600 hover:text-cyan-700 font-medium no-underline"
            >
              Ver histórico
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100">
                <DocumentTextIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {loadingHistory ? '—' : totalAttempts}
                </p>
                <p className="text-xs text-slate-500">Tentativas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-emerald-700">
                  {loadingHistory ? '—' : passedAttempts}
                </p>
                <p className="text-xs text-slate-500">Aprovados</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-100">
                <XCircleIcon className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-rose-600">
                  {loadingHistory ? '—' : failedAttempts}
                </p>
                <p className="text-xs text-slate-500">Reprovados</p>
              </div>
            </div>
          </div>
        </Card>

        <Card noElevation className="p-5 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Taxa de aprovação
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-100">
                <TrophyIcon className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {loadingHistory
                    ? '—'
                    : approvalRate != null
                      ? `${approvalRate.toFixed(0)}%`
                      : '—'}
                </p>
                <p className="text-xs text-slate-500">Atual</p>
              </div>
            </div>
            {evolutionPp != null && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  evolutionPp > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : evolutionPp < 0
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evolutionPp > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : evolutionPp < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                ) : (
                  <MinusIcon className="w-4 h-4" />
                )}
                <span>
                  {evolutionPp > 0 ? '+' : ''}
                  {evolutionPp.toFixed(0)}{' '}
                  <PpTooltip className="text-inherit" />
                </span>
              </div>
            )}
          </div>
          {evolutionPp == null && !loadingHistory && (
            <p className="text-xs text-slate-500 mt-2">
              Complete pelo menos 4 tentativas para ver a evolução.
            </p>
          )}
        </Card>
      </div>

      {/* ═══════════ SEARCH & FILTERS ═══════════ */}
      <div
        className="flex flex-col gap-3"
        style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
      >
        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por instituição, cargo, banca, estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 mr-1">
            <FunnelIcon className="w-3.5 h-3.5" />
            <span className="text-[0.65rem] font-medium uppercase tracking-wide">
              Filtros
            </span>
          </div>

          <FilterAutocomplete
            label="Estado"
            value={selectedState}
            options={stateOptions}
            onChange={(v) => {
              setSelectedState(v)
              if (v !== selectedState) setSelectedCity('')
            }}
          />

          <FilterAutocomplete
            label="Cidade"
            value={selectedCity}
            options={cityOptions}
            onChange={setSelectedCity}
          />

          <FilterAutocomplete
            label="Banca"
            value={selectedBoardId ?? ''}
            options={boardOptions}
            onChange={(v) => setBoardFilter(v || null)}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setBoardFilter(null)
                setSelectedState('')
                setSelectedCity('')
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ RESULTS HEADER ═══════════ */}
      <div
        className="flex items-center justify-between flex-wrap gap-3"
        style={{ animation: 'fade-in-up 0.5s ease-out 200ms both' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            {hasActiveFilters
              ? `${filteredExams.length} resultado${filteredExams.length !== 1 ? 's' : ''}`
              : 'Todas as provas'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="text-xs text-slate-400">
              {totalExams} {totalExams === 1 ? 'prova' : 'provas'} no total
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={handleCreateExam}
              disabled={createDraftMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Criar exame
            </button>
          )}
        </div>
      </div>

      <CreateExamDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        examBoards={examBoards ?? []}
        examBases={examBases}
        onSuccess={refetchExamBases}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!examToDelete} onClose={() => setExamToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir exame</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir <strong>{examToDelete?.name || 'este exame'}</strong>?
            Todas as questões, tentativas e dados relacionados serão removidos permanentemente.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExamToDelete(null)} disabled={deleteMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!examToDelete) return
              await deleteMutation.mutateAsync(examToDelete.id)
              setExamToDelete(null)
            }}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ EXAM LIST ═══════════ */}
      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200/60" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card noElevation className="p-10 border border-slate-200 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Nenhuma prova encontrada
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {search
                  ? `Nenhum resultado para "${search}". Tente outro termo.`
                  : 'Não há provas disponíveis no momento.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setBoardFilter(null)
                  setSelectedState('')
                  setSelectedCity('')
                }}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-medium mt-1 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredExams.map((exam, idx) => (
            <ExamRow
              key={exam.id}
              exam={exam}
              isAdmin={isAdmin}
              animDelay={200 + idx * 30}
              onDelete={isAdmin ? setExamToDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
