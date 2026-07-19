import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type {
  ConcursoEditData,
  UpdateConcursoResult,
} from '@/features/concurso/services/concurso-admin.service'
import type { SyllabusRow } from '@/features/concurso/components/admin/CargoSyllabusEditor'
import {
  CargoSyllabusEditor,
  toSyllabusInput,
  toSyllabusRows,
} from '@/features/concurso/components/admin/CargoSyllabusEditor'
import { authService } from '@/features/auth/services/auth.service'
import {
  useCreateExamBoardMutation,
  useExamBoardQueries,
} from '@/features/examBoard/queries/examBoard.queries'
import { concursoAdminService } from '@/features/concurso/services/concurso-admin.service'
import { ApiError } from '@/lib/api'

export const Route = createFileRoute(
  '/_authenticated/admin/editar-concurso/$concursoId',
)({
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: EditarConcursoPage,
})

function EditarConcursoPage() {
  const { concursoId } = Route.useParams()
  const query = useQuery({
    queryKey: ['concurso', concursoId, 'edit'],
    queryFn: () => concursoAdminService.getForEdit(concursoId),
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: concursoId }}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="size-4" />
          Voltar ao concurso
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-800">Editar concurso</h1>
        <p className="text-sm text-slate-500">
          Ajuste os dados do concurso, as etapas e os cargos. Cargos com prova
          vinculada não podem ser removidos aqui (são geridos pelo wizard de
          provas).
        </p>
      </div>

      {query.isPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Carregando…
        </div>
      )}
      {query.isError && (
        <Alert severity="error">
          {query.error instanceof ApiError
            ? query.error.message
            : 'Erro ao carregar o concurso.'}
        </Alert>
      )}
      {query.isSuccess && (
        <EditConcursoForm concursoId={concursoId} data={query.data} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

type ConcursoFormState = {
  institution: string
  year: string
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string
  city: string
  examBoardId: string
  editalUrl: string
  documentsSourceUrl: string
  registrationStart: string
  registrationEnd: string
  examDate: string
  resultDate: string
}

type CargoFormState = {
  id?: string
  provaCount: number
  role: string
  description: string
  requirements: string
  salaryBase: string
  workload: string
  vacancyCount: string
  hasReserveList: boolean
  registrationFee: string
  minPassingGradeNonQuota: string
  isNursingRelevant: boolean
  syllabusGroups: Array<SyllabusRow>
}

const EMPTY_CARGO: CargoFormState = {
  provaCount: 0,
  role: '',
  description: '',
  requirements: '',
  salaryBase: '',
  workload: '',
  vacancyCount: '',
  hasReserveList: false,
  registrationFee: '',
  minPassingGradeNonQuota: '',
  isNursingRelevant: false,
  syllabusGroups: [],
}

function toCargoForm(c: ConcursoEditData['cargos'][number]): CargoFormState {
  return {
    id: c.id,
    provaCount: c.provaCount,
    role: c.role,
    description: c.description ?? '',
    requirements: c.requirements ?? '',
    salaryBase: c.salaryBase ?? '',
    workload: c.workload ?? '',
    vacancyCount: c.vacancyCount != null ? String(c.vacancyCount) : '',
    hasReserveList: c.hasReserveList,
    registrationFee: c.registrationFee ?? '',
    minPassingGradeNonQuota: c.minPassingGradeNonQuota ?? '',
    isNursingRelevant: c.isNursingRelevant,
    syllabusGroups: toSyllabusRows(c.syllabusGroups),
  }
}

function EditConcursoForm({
  concursoId,
  data,
}: {
  concursoId: string
  data: ConcursoEditData
}) {
  const { data: examBoards = [] } = useExamBoardQueries()
  const createBoardMutation = useCreateExamBoardMutation()

  const [form, setForm] = useState<ConcursoFormState>(() => ({
    institution: data.concurso.institution,
    year: String(data.concurso.year),
    governmentScope: data.concurso.governmentScope,
    state: data.concurso.state ?? '',
    city: data.concurso.city ?? '',
    examBoardId: data.concurso.examBoardId ?? '',
    editalUrl: data.concurso.editalUrl ?? '',
    documentsSourceUrl: data.concurso.documentsSourceUrl ?? '',
    registrationStart: data.concurso.registrationStart ?? '',
    registrationEnd: data.concurso.registrationEnd ?? '',
    examDate: data.concurso.examDate ?? '',
    resultDate: data.concurso.resultDate ?? '',
  }))

  const [etapas, setEtapas] = useState<
    Array<{ name: string; description: string; date: string }>
  >(() =>
    data.concurso.etapas.map((e) => ({
      name: e.name,
      description: e.description ?? '',
      date: e.date?.slice(0, 10) ?? '',
    })),
  )

  const [cargos, setCargos] = useState<Array<CargoFormState>>(() =>
    data.cargos
      .map(toCargoForm)
      .sort(
        (a, b) =>
          Number(b.isNursingRelevant) - Number(a.isNursingRelevant) ||
          a.role.localeCompare(b.role, 'pt-BR'),
      ),
  )
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardAlias, setNewBoardAlias] = useState('')

  function set<TKey extends keyof ConcursoFormState>(
    key: TKey,
    value: ConcursoFormState[TKey],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  function setEtapa(
    idx: number,
    key: 'name' | 'description' | 'date',
    value: string,
  ) {
    setEtapas((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)))
  }
  function setCargo<TKey extends keyof CargoFormState>(
    idx: number,
    key: TKey,
    value: CargoFormState[TKey],
  ) {
    setCargos((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)))
  }
  function removeCargo(idx: number) {
    setCargos((prev) => prev.filter((_, i) => i !== idx))
    setExpandedIdx(null)
  }
  function addCargo() {
    setCargos((prev) => {
      setExpandedIdx(prev.length)
      return [...prev, EMPTY_CARGO]
    })
  }

  const validCargos = cargos.filter((c) => c.role.trim() !== '')

  const updateMutation = useMutation({
    mutationFn: () =>
      concursoAdminService.update(concursoId, {
        institution: form.institution.trim(),
        year: parseInt(form.year, 10),
        governmentScope: form.governmentScope,
        state: form.state.trim() || null,
        city: form.city.trim() || null,
        examBoardId: form.examBoardId || null,
        editalUrl: form.editalUrl.trim() || null,
        documentsSourceUrl: form.documentsSourceUrl.trim() || null,
        registrationStart: form.registrationStart || null,
        registrationEnd: form.registrationEnd || null,
        examDate: form.examDate || null,
        resultDate: form.resultDate || null,
        etapas: etapas
          .filter((e) => e.name.trim() !== '')
          .map((e) => ({
            name: e.name.trim(),
            description: e.description.trim() || null,
            date: e.date || null,
          })),
        cargos: validCargos.map((c) => ({
          id: c.id,
          role: c.role.trim(),
          description: c.description.trim() || null,
          requirements: c.requirements.trim() || null,
          salaryBase: c.salaryBase.trim() || null,
          workload: c.workload.trim() || null,
          vacancyCount: c.vacancyCount ? parseInt(c.vacancyCount, 10) : null,
          hasReserveList: c.hasReserveList,
          registrationFee: c.registrationFee.trim() || null,
          minPassingGradeNonQuota: c.minPassingGradeNonQuota.trim() || null,
          isNursingRelevant: c.isNursingRelevant,
          syllabusGroups: toSyllabusInput(c.syllabusGroups),
        })),
      }),
  })
  const saved: UpdateConcursoResult | null = updateMutation.data ?? null

  async function handleCreateBoard() {
    if (!newBoardName.trim()) return
    const board = await createBoardMutation.mutateAsync({
      name: newBoardName.trim(),
      alias: newBoardAlias.trim() || undefined,
    })
    set('examBoardId', board.id)
    setShowNewBoard(false)
  }

  const canSave =
    form.institution.trim() !== '' &&
    /^\d{4}$/.test(form.year) &&
    validCargos.length > 0 &&
    !updateMutation.isPending

  if (saved) {
    return (
      <Alert severity="success">
        Concurso salvo — {saved.updatedCount} atualizado(s), {saved.createdCount}{' '}
        novo(s), {saved.removedCount} removido(s).{' '}
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: concursoId }}
          className="font-semibold underline"
        >
          Ver página do concurso
        </Link>
      </Alert>
    )
  }

  return (
    <div className="rounded-lg border border-cyan-200 bg-white overflow-hidden">
      <div className="p-4 flex flex-col gap-5">
        {/* Concurso */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-slate-700">Concurso</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <TextField
              size="small"
              label="Instituição *"
              value={form.institution}
              onChange={(e) => set('institution', e.target.value)}
            />
            <TextField
              size="small"
              label="Ano *"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
            />
            <FormControl size="small">
              <InputLabel>Âmbito</InputLabel>
              <Select
                label="Âmbito"
                value={form.governmentScope}
                onChange={(e) => set('governmentScope', e.target.value)}
              >
                <MenuItem value="MUNICIPAL">Municipal</MenuItem>
                <MenuItem value="STATE">Estadual</MenuItem>
                <MenuItem value="FEDERAL">Federal</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Estado (UF)"
              value={form.state}
              onChange={(e) => set('state', e.target.value.toUpperCase())}
              slotProps={{ htmlInput: { maxLength: 2 } }}
            />
            <TextField
              size="small"
              label="Cidade"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
            <FormControl size="small">
              <InputLabel>Banca</InputLabel>
              <Select
                label="Banca"
                value={form.examBoardId}
                onChange={(e) => set('examBoardId', e.target.value)}
              >
                <MenuItem value="">Sem banca</MenuItem>
                {examBoards.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.alias ? `${b.alias} — ${b.name}` : b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Link oficial da organizadora"
              value={form.documentsSourceUrl}
              onChange={(e) => set('documentsSourceUrl', e.target.value)}
              className="sm:col-span-2 lg:col-span-3"
            />
            <TextField
              size="small"
              label="URL do edital (PDF)"
              value={form.editalUrl}
              onChange={(e) => set('editalUrl', e.target.value)}
              className="sm:col-span-2 lg:col-span-3"
            />
            <TextField
              size="small"
              label="Início das inscrições"
              type="date"
              value={form.registrationStart}
              onChange={(e) => set('registrationStart', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="Fim das inscrições"
              type="date"
              value={form.registrationEnd}
              onChange={(e) => set('registrationEnd', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="Data da prova"
              type="date"
              value={form.examDate}
              onChange={(e) => set('examDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label="Data do resultado"
              type="date"
              value={form.resultDate}
              onChange={(e) => set('resultDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>

          {showNewBoard ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-end gap-3 flex-wrap">
              <TextField
                size="small"
                label="Nome da banca"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                sx={{ minWidth: 240 }}
              />
              <TextField
                size="small"
                label="Sigla"
                value={newBoardAlias}
                onChange={(e) => setNewBoardAlias(e.target.value)}
                sx={{ width: 120 }}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={!newBoardName.trim() || createBoardMutation.isPending}
                onClick={handleCreateBoard}
              >
                {createBoardMutation.isPending ? 'Criando...' : 'Criar banca'}
              </Button>
              <Button size="small" onClick={() => setShowNewBoard(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="small"
              className="self-start"
              onClick={() => setShowNewBoard(true)}
            >
              + Cadastrar nova banca
            </Button>
          )}
        </section>

        {/* Etapas */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">
              Etapas do concurso ({etapas.length})
            </h2>
            <Button
              size="small"
              startIcon={<PlusIcon className="size-4" />}
              onClick={() =>
                setEtapas((prev) => [...prev, { name: '', description: '', date: '' }])
              }
            >
              Adicionar etapa
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {etapas.map((etapa, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400">
                  {idx + 1}.
                </span>
                <TextField
                  size="small"
                  label="Etapa"
                  value={etapa.name}
                  onChange={(e) => setEtapa(idx, 'name', e.target.value)}
                  sx={{ width: 200 }}
                />
                <TextField
                  size="small"
                  label="Data"
                  type="date"
                  value={etapa.date}
                  onChange={(e) => setEtapa(idx, 'date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 150 }}
                />
                <TextField
                  size="small"
                  label="Descrição"
                  value={etapa.description}
                  onChange={(e) => setEtapa(idx, 'description', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  aria-label={`Remover etapa: ${etapa.name || 'nova etapa'}`}
                  onClick={() =>
                    setEtapas((prev) => prev.filter((_, i) => i !== idx))
                  }
                  sx={{ mt: 0.5 }}
                >
                  <TrashIcon className="size-4 text-slate-400" />
                </IconButton>
              </div>
            ))}
            {etapas.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma etapa.</p>
            )}
          </div>
        </section>

        {/* Cargos */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">
              Cargos ({cargos.length})
            </h2>
            <Button size="small" startIcon={<PlusIcon className="size-4" />} onClick={addCargo}>
              Adicionar cargo
            </Button>
          </div>

          <div className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
            {cargos.map((cargo, idx) => {
              const expanded = expandedIdx === idx
              const meta = [
                cargo.vacancyCount
                  ? `${cargo.vacancyCount} ${cargo.vacancyCount === '1' ? 'vaga' : 'vagas'}`
                  : null,
                cargo.salaryBase ? `R$ ${cargo.salaryBase}` : null,
              ]
                .filter(Boolean)
                .join(' · ')
              const locked = cargo.provaCount > 0
              return (
                <div key={cargo.id ?? `new-${idx}`} className={expanded ? 'bg-slate-50' : undefined}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(expanded ? null : idx)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Recolher' : 'Editar'} cargo: ${cargo.role || 'novo cargo'}`}
                      className="flex flex-1 items-center gap-2 text-left min-w-0"
                    >
                      {expanded ? (
                        <ChevronUpIcon className="size-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="size-4 shrink-0 text-slate-400" />
                      )}
                      <span className="truncate text-sm font-medium text-slate-800">
                        {cargo.role || '(novo cargo)'}
                      </span>
                      {meta && (
                        <span className="hidden sm:inline text-xs text-slate-500 shrink-0">
                          {meta}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cargo.isNursingRelevant && (
                        <Chip label="Enfermagem" size="small" color="primary" />
                      )}
                      {locked && (
                        <Chip label={`${cargo.provaCount} prova(s)`} size="small" variant="outlined" />
                      )}
                      <IconButton
                        size="small"
                        disabled={locked}
                        title={
                          locked
                            ? 'Cargo com prova vinculada — remova a prova pelo wizard antes.'
                            : undefined
                        }
                        aria-label={`Remover cargo: ${cargo.role || 'novo cargo'}`}
                        onClick={() => removeCargo(idx)}
                      >
                        <TrashIcon className="size-4 text-slate-400" />
                      </IconButton>
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-3 pb-4 pt-1">
                      <TextField
                        size="small"
                        label="Cargo *"
                        value={cargo.role}
                        onChange={(e) => setCargo(idx, 'role', e.target.value)}
                      />
                      <TextField
                        size="small"
                        label="Salário base (R$)"
                        value={cargo.salaryBase}
                        onChange={(e) => setCargo(idx, 'salaryBase', e.target.value)}
                        placeholder="4750.00"
                      />
                      <TextField
                        size="small"
                        label="Carga horária"
                        value={cargo.workload}
                        onChange={(e) => setCargo(idx, 'workload', e.target.value)}
                      />
                      <TextField
                        size="small"
                        label="Vagas"
                        value={cargo.vacancyCount}
                        onChange={(e) => setCargo(idx, 'vacancyCount', e.target.value)}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                      />
                      <TextField
                        size="small"
                        label="Taxa de inscrição (R$)"
                        value={cargo.registrationFee}
                        onChange={(e) => setCargo(idx, 'registrationFee', e.target.value)}
                      />
                      <TextField
                        size="small"
                        label="Nota mínima (ampla)"
                        value={cargo.minPassingGradeNonQuota}
                        onChange={(e) =>
                          setCargo(idx, 'minPassingGradeNonQuota', e.target.value)
                        }
                      />
                      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={cargo.hasReserveList}
                              onChange={(e) =>
                                setCargo(idx, 'hasReserveList', e.target.checked)
                              }
                            />
                          }
                          label="Cadastro de reserva"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={cargo.isNursingRelevant}
                              onChange={(e) =>
                                setCargo(idx, 'isNursingRelevant', e.target.checked)
                              }
                            />
                          }
                          label="Relevante para enfermagem"
                        />
                      </div>
                      <TextField
                        size="small"
                        label="Requisitos"
                        value={cargo.requirements}
                        onChange={(e) => setCargo(idx, 'requirements', e.target.value)}
                        multiline
                        minRows={2}
                        className="sm:col-span-2 lg:col-span-3"
                      />
                      <TextField
                        size="small"
                        label="Descrição / atribuições"
                        value={cargo.description}
                        onChange={(e) => setCargo(idx, 'description', e.target.value)}
                        multiline
                        minRows={3}
                        className="sm:col-span-2 lg:col-span-3"
                      />
                      <CargoSyllabusEditor
                        rows={cargo.syllabusGroups}
                        onChange={(rows) => setCargo(idx, 'syllabusGroups', rows)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {updateMutation.isError && (
          <Alert severity="error">
            {updateMutation.error instanceof ApiError
              ? updateMutation.error.message
              : 'Erro ao salvar o concurso.'}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="contained"
            startIcon={
              updateMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            disabled={!canSave}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
