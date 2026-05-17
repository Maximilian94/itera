import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { authService } from '@/features/auth/services/auth.service'
import {
  useScraperEntriesQuery,
  useScraperRunsQuery,
  useScraperRunStatusQuery,
  useTriggerRunMutation,
  useUpdateEntryStatusMutation,
  usePromoteEntryMutation,
} from '@/features/scraper/scraper.queries'

export const Route = createFileRoute('/_authenticated/admin/pci-scraper')({
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: PciScraperPage,
})

type SortField =
  | 'priorityScore'
  | 'examName'
  | 'year'
  | 'institution'
  | 'examBoardRaw'
  | 'status'
type SortDir = 'asc' | 'desc'

const SCOPE_LABELS: Record<string, string> = {
  FEDERAL: 'Federal',
  STATE: 'Estadual',
  MUNICIPAL: 'Municipal',
}

const STATUS_COLORS: Record<
  string,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  PENDING: 'default',
  PROMOTED: 'success',
  SKIPPED: 'warning',
  UNAVAILABLE: 'error',
}

const ROW_HEIGHT = 48

function PciScraperPage() {
  const {
    data: entries,
    isLoading: entriesLoading,
    error: entriesError,
  } = useScraperEntriesQuery()
  const { data: runs } = useScraperRunsQuery()

  const lastRun = runs?.[0] ?? null
  const isRunning = lastRun?.status === 'running'

  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const { data: activeRun } = useScraperRunStatusQuery(
    activeRunId,
    isRunning || activeRunId !== null,
  )

  const triggerMutation = useTriggerRunMutation()
  const updateStatusMutation = useUpdateEntryStatusMutation()
  const promoteMutation = usePromoteEntryMutation()

  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('')
  const [scopeFilter, setScopeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showDiffOnly, setShowDiffOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('priorityScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const parentRef = useRef<HTMLDivElement>(null)

  const years = useMemo(() => {
    if (!entries) return []
    const unique = [...new Set(entries.map((e) => e.year))].sort(
      (a, b) => b - a,
    )
    return unique
  }, [entries])

  const filtered = useMemo(() => {
    if (!entries) return []
    const q = search.toLowerCase().trim()
    let result = entries

    if (q) {
      result = result.filter(
        (e) =>
          e.examName.toLowerCase().includes(q) ||
          e.institution.toLowerCase().includes(q) ||
          e.examBoardRaw.toLowerCase().includes(q),
      )
    }
    if (yearFilter) {
      result = result.filter((e) => e.year === parseInt(yearFilter))
    }
    if (scopeFilter) {
      result = result.filter((e) => e.governmentScope === scopeFilter)
    }
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter)
    }
    if (showDiffOnly && lastRun) {
      result = result.filter((e) => e.scraperRunId === lastRun.id)
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'priorityScore':
          cmp = a.priorityScore - b.priorityScore
          break
        case 'examName':
          cmp = a.examName.localeCompare(b.examName)
          break
        case 'year':
          cmp = a.year - b.year
          break
        case 'institution':
          cmp = a.institution.localeCompare(b.institution)
          break
        case 'examBoardRaw':
          cmp = a.examBoardRaw.localeCompare(b.examBoardRaw)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [
    entries,
    search,
    yearFilter,
    scopeFilter,
    statusFilter,
    showDiffOnly,
    lastRun,
    sortField,
    sortDir,
  ])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
    },
    [sortField],
  )

  const handleTriggerRun = async () => {
    const run = await triggerMutation.mutateAsync(undefined)
    setActiveRunId(run.id)
  }

  const statusCounts = useMemo(() => {
    if (!entries) return { PENDING: 0, PROMOTED: 0, SKIPPED: 0, UNAVAILABLE: 0 }
    const counts = { PENDING: 0, PROMOTED: 0, SKIPPED: 0, UNAVAILABLE: 0 }
    for (const e of entries) counts[e.status]++
    return counts
  }, [entries])

  if (entriesLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-bold text-slate-800">
          PCI Scraper — Catalogo de Provas
        </h1>
        <p className="text-slate-500">Carregando...</p>
      </div>
    )
  }

  if (entriesError) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-bold text-slate-800">
          PCI Scraper — Catalogo de Provas
        </h1>
        <p className="text-red-500">
          Erro ao carregar: {entriesError.message}
        </p>
      </div>
    )
  }

  const currentRun = activeRun ?? lastRun

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Header */}
      <h1 className="text-xl font-bold text-slate-800">
        PCI Scraper — Catalogo de Provas
      </h1>

      {/* Run Panel */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          {lastRun ? (
            <>
              <span className="text-sm text-slate-600">
                Ultimo scraping:{' '}
                <strong>
                  {dayjs(lastRun.finishedAt ?? lastRun.startedAt).format(
                    'DD/MM/YYYY HH:mm',
                  )}
                </strong>
              </span>
              <span className="text-sm text-slate-500">
                Resultado: +{lastRun.newEntries} novas provas |{' '}
                {lastRun.totalEntries} total | Status:{' '}
                <Chip
                  label={lastRun.status}
                  size="small"
                  color={
                    lastRun.status === 'completed'
                      ? 'success'
                      : lastRun.status === 'failed'
                        ? 'error'
                        : 'info'
                  }
                  sx={{ height: 20, fontSize: 11 }}
                />
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">
              Nenhum scraping realizado ainda
            </span>
          )}

          {isRunning && currentRun && (
            <span className="text-sm text-cyan-600 animate-pulse">
              Processando: {currentRun.lastCargoSlug ?? '...'} pagina{' '}
              {currentRun.lastPage ?? '...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastRun && lastRun.newEntries > 0 && (
            <Button
              size="small"
              variant={showDiffOnly ? 'contained' : 'outlined'}
              onClick={() => setShowDiffOnly((v) => !v)}
            >
              {showDiffOnly ? 'Mostrar todos' : `Mostrar novos (+${lastRun.newEntries})`}
            </Button>
          )}
          <Button
            variant="contained"
            disabled={isRunning || triggerMutation.isPending}
            onClick={handleTriggerRun}
          >
            {isRunning ? 'Scraping em andamento...' : 'Iniciar Novo Scraping'}
          </Button>
        </div>
      </div>

      {/* Filters + Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <TextField
          size="small"
          placeholder="Buscar por prova, orgao ou banca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 320 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlassIcon className="size-4 text-slate-400" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <XMarkIcon className="size-4" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Ano</InputLabel>
          <Select
            value={yearFilter}
            label="Ano"
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {years.map((y) => (
              <MenuItem key={y} value={String(y)}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Esfera</InputLabel>
          <Select
            value={scopeFilter}
            label="Esfera"
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="FEDERAL">Federal</MenuItem>
            <MenuItem value="STATE">Estadual</MenuItem>
            <MenuItem value="MUNICIPAL">Municipal</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PENDING">Pendente</MenuItem>
            <MenuItem value="PROMOTED">Promovido</MenuItem>
            <MenuItem value="SKIPPED">Ignorado</MenuItem>
            <MenuItem value="UNAVAILABLE">Indisponivel</MenuItem>
          </Select>
        </FormControl>

        <div className="flex items-center gap-2 ml-auto">
          <Chip
            label={`Total: ${entries?.length ?? 0}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Pendentes: ${statusCounts.PENDING}`}
            size="small"
            color="default"
          />
          <Chip
            label={`Promovidos: ${statusCounts.PROMOTED}`}
            size="small"
            color="success"
          />
          <Chip
            label={`Ignorados: ${statusCounts.SKIPPED}`}
            size="small"
            color="warning"
          />
        </div>
      </div>

      <div className="text-xs text-slate-400">
        {filtered.length} resultados
        {filtered.length !== (entries?.length ?? 0) &&
          ` de ${entries?.length ?? 0}`}
      </div>

      {/* Virtual Scrolling Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white flex-1 min-h-0">
        {/* Table header */}
        <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
          <div className="flex text-xs font-semibold uppercase tracking-wide text-slate-500">
            <HeaderCell
              field="priorityScore"
              label="Score"
              width="w-[70px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <HeaderCell
              field="examName"
              label="Prova"
              width="flex-1 min-w-[200px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <HeaderCell
              field="year"
              label="Ano"
              width="w-[60px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <HeaderCell
              field="institution"
              label="Orgao"
              width="w-[200px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <HeaderCell
              field="examBoardRaw"
              label="Banca"
              width="w-[140px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <div className="px-3 py-2 w-[80px]">Esfera</div>
            <div className="px-3 py-2 w-[50px]">UF</div>
            <HeaderCell
              field="status"
              label="Status"
              width="w-[100px]"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <div className="px-3 py-2 w-[160px]">Acoes</div>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          ref={parentRef}
          className="overflow-y-auto"
          style={{ height: 'calc(100% - 36px)' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = filtered[virtualRow.index]
              const isNew =
                showDiffOnly ||
                (lastRun && entry.scraperRunId === lastRun.id)

              return (
                <div
                  key={entry.id}
                  className={`flex items-center border-b border-slate-100 text-sm ${
                    isNew && showDiffOnly ? 'bg-green-50' : 'hover:bg-slate-50'
                  }`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="px-3 py-2 w-[70px] font-mono text-xs font-bold text-slate-700">
                    {entry.priorityScore.toFixed(0)}
                  </div>
                  <div
                    className="px-3 py-2 flex-1 min-w-[200px] truncate text-slate-800"
                    title={entry.examName}
                  >
                    {entry.examName}
                  </div>
                  <div className="px-3 py-2 w-[60px] text-slate-600">
                    {entry.year}
                  </div>
                  <div
                    className="px-3 py-2 w-[200px] truncate text-slate-600"
                    title={entry.institution}
                  >
                    {entry.institution}
                  </div>
                  <div
                    className="px-3 py-2 w-[140px] truncate text-slate-600"
                    title={entry.examBoardRaw}
                  >
                    {entry.examBoardRaw}
                  </div>
                  <div className="px-3 py-2 w-[80px] text-xs text-slate-500">
                    {entry.governmentScope
                      ? SCOPE_LABELS[entry.governmentScope] ?? entry.governmentScope
                      : '—'}
                  </div>
                  <div className="px-3 py-2 w-[50px] text-xs text-slate-500">
                    {entry.state ?? '—'}
                  </div>
                  <div className="px-3 py-2 w-[100px]">
                    <Chip
                      label={entry.status}
                      size="small"
                      color={STATUS_COLORS[entry.status] ?? 'default'}
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </div>
                  <div className="px-3 py-2 w-[160px] flex items-center gap-1">
                    {entry.status === 'PENDING' && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 0, px: 1, fontSize: 11, height: 24 }}
                          disabled={promoteMutation.isPending}
                          onClick={() => promoteMutation.mutate(entry.id)}
                        >
                          Promover
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          sx={{ minWidth: 0, px: 1, fontSize: 11, height: 24 }}
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: entry.id,
                              status: 'SKIPPED',
                            })
                          }
                        >
                          Ignorar
                        </Button>
                      </>
                    )}
                    <a
                      href={entry.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-600 hover:underline"
                    >
                      PDF
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeaderCell({
  field,
  label,
  width,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField
  label: string
  width: string
  sortField: SortField
  sortDir: SortDir
  onSort: (field: SortField) => void
}) {
  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:text-slate-700 select-none ${width}`}
      onClick={() => onSort(field)}
    >
      {label}
      {sortField === field &&
        (sortDir === 'asc' ? (
          <ChevronUpIcon className="size-3 inline ml-1" />
        ) : (
          <ChevronDownIcon className="size-3 inline ml-1" />
        ))}
    </div>
  )
}
