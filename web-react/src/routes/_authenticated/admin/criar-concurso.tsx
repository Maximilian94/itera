import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
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
  ExtractedCargoFicha,
  ExtractedEditalConcurso,
} from '@/features/examBase/domain/examBase.types'
import type { CreateConcursoResult } from '@/features/concurso/services/concurso-admin.service'
import type { ScrapeStash } from '@/features/scraper/scrape-stash'
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
import { useExtractEditalQuery } from '@/features/examBase/queries/examBase.queries'
import { concursoAdminService } from '@/features/concurso/services/concurso-admin.service'
import { clearScrape, readScrape } from '@/features/scraper/scrape-stash'
import { ApiError } from '@/lib/api'

// Chegada do scraper de documentos: ?editalUrl=... dispara a extração sozinho;
// ?editalName=... só rotula de onde os dados vieram. Sem search params a página
// funciona standalone (cola a URL do edital e extrai).
export const Route = createFileRoute('/_authenticated/admin/criar-concurso')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { editalUrl?: string; editalName?: string } => ({
    editalUrl:
      typeof search.editalUrl === 'string' && search.editalUrl ? search.editalUrl : undefined,
    editalName:
      typeof search.editalName === 'string' && search.editalName
        ? search.editalName
        : undefined,
  }),
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: CriarConcursoPage,
})

function CriarConcursoPage() {
  const { editalUrl: searchEditalUrl, editalName } = Route.useSearch()
  const [editalUrl, setEditalUrl] = useState(searchEditalUrl ?? '')
  // A URL "ativa" alimenta a query de extração: chegar do scraper já inicia
  // com ela (auto-extração sem useEffect — mutate() em effect sob StrictMode
  // perdia a atualização e o pending nunca resolvia).
  const [activeUrl, setActiveUrl] = useState<string | null>(searchEditalUrl ?? null)
  const extractQuery = useExtractEditalQuery(activeUrl)
  // Documentos raspados na página anterior (scraper) — viram a timeline de
  // Notícias. Lido uma vez; ausente quando o admin chega standalone.
  const [scraped] = useState<ScrapeStash | null>(() => readScrape())

  const handleExtract = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed || extractQuery.isFetching) return
    setActiveUrl(trimmed)
  }

  return (
    // Sem h-full/overflow próprio: o scroll é do div do layout _authenticated
    // (data-scroll-restoration-id), como nas demais páginas.
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <Link
          to="/admin/document-scraper"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="size-4" />
          Scraper de documentos
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-800">Criar concurso</h1>
        <p className="text-sm text-slate-500">
          A IA lê o edital e preenche a ficha do concurso e de todos os cargos —
          revise e confirme. As provas entram depois, pelo wizard, e se ligam ao
          concurso automaticamente.
        </p>
      </div>

      {/* URL do edital + extração */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleExtract(editalUrl)
        }}
        className="rounded-lg border border-slate-200 bg-white p-4 flex items-center gap-3 flex-wrap"
      >
        <TextField
          size="small"
          label="URL do edital (PDF ou página)"
          placeholder="https://www.banca.org.br/concursos/prefeitura-x/edital-01.pdf"
          value={editalUrl}
          onChange={(e) => setEditalUrl(e.target.value)}
          sx={{ flex: 1, minWidth: 320 }}
          type="url"
          disabled={extractQuery.isFetching}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={extractQuery.isFetching || !editalUrl.trim()}
        >
          {extractQuery.isFetching ? 'Extraindo...' : 'Extrair do edital'}
        </Button>
      </form>

      {extractQuery.isFetching && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-700 animate-pulse">
          Lendo {editalName ? `"${editalName}"` : 'o edital'} e extraindo os
          dados do concurso e de todos os cargos com IA — editais grandes levam
          1 a 2 minutos...
        </div>
      )}

      {extractQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {extractQuery.error instanceof ApiError
            ? extractQuery.error.message
            : 'Erro ao extrair os dados do edital.'}
        </div>
      )}

      {extractQuery.isSuccess && activeUrl && (
        <ConcursoCreateForm
          key={activeUrl}
          editalUrl={activeUrl}
          editalName={editalName ?? null}
          extracted={extractQuery.data}
          scraped={scraped}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Form de revisão — dados extraídos → criar Concurso + Cargos        */
/* ------------------------------------------------------------------ */

type ConcursoFormState = {
  institution: string
  year: string
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string
  city: string
  examBoardId: string
  editalUrl: string
  registrationStart: string
  registrationEnd: string
  examDate: string
  resultDate: string
}

type CargoFormState = {
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

function toCargoForm(c: ExtractedCargoFicha): CargoFormState {
  return {
    role: c.role,
    description: c.description ?? '',
    requirements: c.requirements ?? '',
    salaryBase: c.salaryBase ?? '',
    workload: c.workload ?? '',
    vacancyCount: c.vacancyCount != null ? String(c.vacancyCount) : '',
    hasReserveList: c.hasReserveList ?? false,
    registrationFee: c.registrationFee ?? '',
    minPassingGradeNonQuota: c.minPassingGradeNonQuota ?? '',
    isNursingRelevant: c.isNursingRelevant ?? false,
    syllabusGroups: toSyllabusRows(c.syllabusGroups),
  }
}

/** Rótulos dos tipos de documento (espelha o mapa da página do scraper). */
const DOC_KIND_LABELS: Record<string, string> = {
  EDITAL_ABERTURA: 'Edital de abertura',
  RETIFICACAO: 'Retificação',
  GABARITO: 'Gabarito',
  RESULTADO: 'Resultado',
  CONVOCACAO: 'Convocação',
  COMUNICADO: 'Comunicado',
  OUTRO: 'Documento',
}

type DocFormState = {
  title: string
  summary: string
  url: string
  kind: string
  publishedAt: string | null
}

function ConcursoCreateForm({
  editalUrl,
  editalName,
  extracted,
  scraped,
}: {
  editalUrl: string
  editalName: string | null
  extracted: ExtractedEditalConcurso
  scraped: ScrapeStash | null
}) {
  const { data: examBoards = [] } = useExamBoardQueries()
  const createBoardMutation = useCreateExamBoardMutation()

  // Documentos raspados → timeline de Notícias. Só os que têm URL entram
  // (o documento sem link não dá para abrir nem monitorar), do mais recente
  // ao mais antigo.
  const [documents, setDocuments] = useState<Array<DocFormState>>(() =>
    (scraped?.documents ?? [])
      .filter((d) => !!d.url)
      .map((d) => ({
        title: d.name,
        summary: d.summary ?? '',
        url: d.url as string,
        kind: d.kind,
        publishedAt: d.publishedAt,
      }))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')),
  )

  const extractedYear = (
    extracted.registrationStart ??
    extracted.examDate ??
    ''
  ).slice(0, 4)

  const [form, setForm] = useState<ConcursoFormState>(() => ({
    institution: extracted.institution ?? '',
    year: extractedYear,
    governmentScope: extracted.governmentScope ?? 'MUNICIPAL',
    state: extracted.state ?? '',
    city: extracted.city ?? '',
    examBoardId: '',
    editalUrl: extracted.editalUrl ?? editalUrl,
    registrationStart: extracted.registrationStart?.slice(0, 10) ?? '',
    registrationEnd: extracted.registrationEnd?.slice(0, 10) ?? '',
    examDate: extracted.examDate?.slice(0, 10) ?? '',
    resultDate: extracted.resultDate?.slice(0, 10) ?? '',
  }))

  // Cronograma: etapas do certame com data (Inscrições, Prova, Títulos...).
  const [etapas, setEtapas] = useState<
    Array<{ name: string; description: string; date: string }>
  >(() =>
    (extracted.etapas ?? []).map((e) => ({
      name: e.name,
      description: e.description ?? '',
      date: e.date?.slice(0, 10) ?? '',
    })),
  )

  function setEtapa(
    idx: number,
    key: 'name' | 'description' | 'date',
    value: string,
  ) {
    setEtapas((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)))
  }

  // Cargos: os de enfermagem primeiro (são o foco do produto), depois A→Z.
  const [cargos, setCargos] = useState<Array<CargoFormState>>(() =>
    (extracted.cargos ?? [])
      .map(toCargoForm)
      .sort(
        (a, b) =>
          Number(b.isNursingRelevant) - Number(a.isNursingRelevant) ||
          a.role.localeCompare(b.role, 'pt-BR'),
      ),
  )
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

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

  function setDoc<TKey extends keyof DocFormState>(
    idx: number,
    key: TKey,
    value: DocFormState[TKey],
  ) {
    setDocuments((prev) => prev.map((d, i) => (i === idx ? { ...d, [key]: value } : d)))
  }

  function removeDoc(idx: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== idx))
  }

  /* Banca: casa a extraída com as cadastradas; sem match → mini-form. */
  const [boardMatched, setBoardMatched] = useState(false)
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState(extracted.examBoardName ?? '')
  const [newBoardAlias, setNewBoardAlias] = useState(extracted.examBoardAlias ?? '')
  useEffect(() => {
    if (boardMatched || examBoards.length === 0) return
    setBoardMatched(true)
    if (!extracted.examBoardName && !extracted.examBoardAlias) return
    const match = examBoards.find(
      (b) =>
        (extracted.examBoardName &&
          b.name.toLowerCase() === extracted.examBoardName.toLowerCase()) ||
        (extracted.examBoardAlias &&
          b.alias?.toLowerCase() === extracted.examBoardAlias.toLowerCase()),
    )
    if (match) setForm((prev) => ({ ...prev, examBoardId: match.id }))
    else setShowNewBoard(true)
  }, [boardMatched, examBoards, extracted.examBoardName, extracted.examBoardAlias])

  function set<TKey extends keyof ConcursoFormState>(
    key: TKey,
    value: ConcursoFormState[TKey],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validCargos = cargos.filter((c) => c.role.trim() !== '')

  const createMutation = useMutation({
    mutationFn: () =>
      concursoAdminService.createFromEdital({
        institution: form.institution.trim(),
        year: parseInt(form.year, 10),
        governmentScope: form.governmentScope,
        state: form.state.trim() || null,
        city: form.city.trim() || null,
        examBoardId: form.examBoardId || null,
        editalUrl: form.editalUrl.trim() || null,
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
        documents: documents
          .filter((d) => d.url.trim() !== '')
          .map((d) => ({
            title: d.title.trim() || d.url.trim(),
            summary: d.summary.trim() || null,
            url: d.url.trim(),
            kind: d.kind || 'OUTRO',
            publishedAt: d.publishedAt,
            sourceUrl: scraped?.sourceUrl ?? null,
          })),
        cargos: validCargos.map((c) => ({
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
    // Documentos consumidos: some o stash para não vazar para uma próxima criação.
    onSuccess: () => clearScrape(),
  })
  const created: CreateConcursoResult | null = createMutation.data ?? null

  async function handleCreateBoard() {
    if (!newBoardName.trim()) return
    const board = await createBoardMutation.mutateAsync({
      name: newBoardName.trim(),
      alias: newBoardAlias.trim() || undefined,
    })
    set('examBoardId', board.id)
    setShowNewBoard(false)
  }

  const canCreate =
    form.institution.trim() !== '' &&
    /^\d{4}$/.test(form.year) &&
    validCargos.length > 0 &&
    !createMutation.isPending

  if (created) {
    return (
      <Alert severity="success">
        Concurso <strong>{created.concurso.institution} {created.concurso.year}</strong>{' '}
        salvo com <strong>{created.cargos.length}</strong>{' '}
        {created.cargos.length === 1 ? 'cargo' : 'cargos'}
        {created.updatedCount > 0
          ? ` (${created.createdCount} novos, ${created.updatedCount} atualizados)`
          : ''}
        {created.documentCount > 0
          ? ` e ${created.documentCount} ${created.documentCount === 1 ? 'documento' : 'documentos'} na timeline de Notícias`
          : ''}
        .{' '}
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: created.concurso.slug ?? created.concurso.id }}
          className="font-semibold underline"
        >
          Ver página do concurso
        </Link>
      </Alert>
    )
  }

  return (
    <div className="rounded-lg border border-cyan-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-cyan-50">
        <p className="text-sm font-semibold text-cyan-900">
          Revisar dados do concurso
          {editalName ? ` — extraídos de "${editalName}"` : ''}
        </p>
        <p className="text-xs text-cyan-800">
          Confira os campos antes de criar.
        </p>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Seção Concurso */}
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
                onChange={(e) =>
                  set('governmentScope', e.target.value)
                }
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
              label="URL do edital"
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

          {showNewBoard && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-end gap-3 flex-wrap">
              <span className="text-xs text-slate-600 w-full">
                A banca extraída não está cadastrada. Criar agora?
              </span>
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
                Ignorar
              </Button>
            </div>
          )}
        </section>

        {/* Seção Etapas do concurso */}
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
                  label="Descrição (caráter, a quem se aplica)"
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
              <p className="text-sm text-slate-400">
                Nenhuma etapa extraída — adicione manualmente se o edital
                descrever fases (Prova Objetiva, Títulos, TAF...).
              </p>
            )}
          </div>
        </section>

        {/* Seção Documentos (Notícias) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-700">
              Documentos / Notícias ({documents.length})
            </h2>
            <span className="text-xs text-slate-400">
              Viram a timeline de Notícias do concurso
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {documents.map((doc, idx) => (
              <div
                key={`${doc.url}-${idx}`}
                className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold tabular-nums text-slate-500">
                    {doc.publishedAt
                      ? dayjs(doc.publishedAt).format('DD/MM/YYYY')
                      : 'sem data'}
                  </span>
                  <Chip
                    label={DOC_KIND_LABELS[doc.kind] ?? 'Documento'}
                    size="small"
                    variant="outlined"
                  />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-700 hover:underline break-all"
                  >
                    Abrir
                  </a>
                  <IconButton
                    size="small"
                    aria-label={`Remover documento: ${doc.title || 'documento'}`}
                    onClick={() => removeDoc(idx)}
                    sx={{ ml: 'auto' }}
                  >
                    <TrashIcon className="size-4 text-slate-400" />
                  </IconButton>
                </div>
                <TextField
                  size="small"
                  label="Título"
                  value={doc.title}
                  onChange={(e) => setDoc(idx, 'title', e.target.value)}
                />
                <TextField
                  size="small"
                  label="Resumo"
                  value={doc.summary}
                  onChange={(e) => setDoc(idx, 'summary', e.target.value)}
                  multiline
                  minRows={2}
                />
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum documento — abra este concurso pelo scraper de documentos
                para trazer o histórico de publicações, ou siga sem Notícias.
              </p>
            )}
          </div>
        </section>

        {/* Seção Cargos */}
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
              return (
                <div key={idx} className={expanded ? 'bg-slate-50' : undefined}>
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
                      {cargo.hasReserveList && (
                        <Chip label="CR" size="small" variant="outlined" />
                      )}
                      <IconButton
                        size="small"
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
                        placeholder="40 horas semanais"
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
                        placeholder="110.00"
                      />
                      <TextField
                        size="small"
                        label="Nota mínima (ampla)"
                        value={cargo.minPassingGradeNonQuota}
                        onChange={(e) =>
                          setCargo(idx, 'minPassingGradeNonQuota', e.target.value)
                        }
                        placeholder="70.00"
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
            {cargos.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400">
                Nenhum cargo — a extração não encontrou cargos ou todos foram
                removidos. Adicione ao menos um.
              </p>
            )}
          </div>
        </section>

        {createMutation.isError && (
          <Alert severity="error">
            {createMutation.error instanceof ApiError
              ? createMutation.error.message
              : 'Erro ao criar o concurso.'}
          </Alert>
        )}

        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-slate-500">
            {validCargos.length} {validCargos.length === 1 ? 'cargo' : 'cargos'} serão salvos
          </span>
          <Button
            variant="contained"
            startIcon={
              createMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            disabled={!canCreate}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Criando concurso...' : 'Criar concurso'}
          </Button>
        </div>
      </div>
    </div>
  )
}
