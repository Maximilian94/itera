import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@mui/material'
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import type {
  AdminConcursoRow,
  ConcursoStatus,
  ConcursoUpdateReport,
  DiscoveryCandidate,
} from '@/features/scraper/scraper.types'
import { authService } from '@/features/auth/services/auth.service'
import {
  scraperKeys,
  useAdminConcursosQuery,
  useDiscoveryAddMutation,
  useDiscoveryReextractMutation,
  useDiscoverySearchMutation,
  useSetConcursoClosedMutation,
} from '@/features/scraper/scraper.queries'
import { scraperService } from '@/features/scraper/scraper.service'
import { checkFreshness } from '@/features/scraper/check-freshness'
import { StatusPill } from '@/features/concurso/components/StatusPill'
import { ApiError } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/admin/gerenciar-concursos')(
  {
    beforeLoad: async () => {
      const profile = await authService.getProfile()
      if (profile.user?.role !== 'ADMIN') {
        throw redirect({ to: '/dashboard' })
      }
    },
    component: GerenciarConcursosPage,
  },
)

const STATUS_LABEL: Record<ConcursoStatus, string> = {
  open: 'Inscrições abertas',
  future: 'Em andamento',
  past: 'Concluído',
}

/** Estado do add por candidato (chaveado pela URL da notícia). */
type AddState = 'adding' | 'done' | 'done-nolink' | 'error'

/** Progresso do "Atualizar concursos" em massa (loop sequencial no front). */
type UpdatePhase = {
  running: boolean
  done: number
  total: number
  current: string | null
}

function GerenciarConcursosPage() {
  const queryClient = useQueryClient()
  const concursosQuery = useAdminConcursosQuery()
  const searchMutation = useDiscoverySearchMutation()
  const addMutation = useDiscoveryAddMutation()
  const reextractMutation = useDiscoveryReextractMutation()

  const [panelOpen, setPanelOpen] = useState(false)
  const [addState, setAddState] = useState<
    Record<string, AddState | undefined>
  >({})

  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>({
    running: false,
    done: 0,
    total: 0,
    current: null,
  })
  const [updateReports, setUpdateReports] = useState<Array<ConcursoUpdateReport>>(
    [],
  )

  const candidates = searchMutation.data?.candidates ?? []

  const handleSearch = () => {
    setPanelOpen(true)
    setAddState({})
    searchMutation.mutate(undefined)
  }

  const handleReextract = () => {
    if (reextractMutation.isPending) return
    const total = concursosQuery.data?.length ?? 0
    // Reprocessa todos de uma vez — confirma porque re-raspa N sites de banca.
    if (
      !window.confirm(
        `Recorrigir o link do concurso de todos os ${total} concursos vindos do pciconcursos? Re-visita a notícia + o site da banca de cada um (pode levar minutos).`,
      )
    )
      return
    reextractMutation.mutate()
  }

  const handleAdd = async (c: DiscoveryCandidate) => {
    if (addState[c.newsUrl] === 'adding' || addState[c.newsUrl]?.startsWith('done'))
      return
    setAddState((s) => ({ ...s, [c.newsUrl]: 'adding' }))
    try {
      const res = await addMutation.mutateAsync({
        institution: c.institution,
        uf: c.uf,
        headline: c.headline,
        newsUrl: c.newsUrl,
      })
      setAddState((s) => ({
        ...s,
        [c.newsUrl]: res.officialUrlFound ? 'done' : 'done-nolink',
      }))
    } catch {
      setAddState((s) => ({ ...s, [c.newsUrl]: 'error' }))
    }
  }

  const newCandidates = candidates.filter((c) => c.status === 'new')
  const pendingNew = newCandidates.filter(
    (c) => !addState[c.newsUrl]?.startsWith('done'),
  )

  const handleAddAll = async () => {
    for (const c of pendingNew) {
      // Sequencial: cada add visita a notícia + IA; em paralelo estouraria a origem.
      await handleAdd(c)
    }
  }

  const handleUpdate = async () => {
    if (updatePhase.running) return
    const targets = (concursosQuery.data ?? []).filter((r) => !r.closed)
    if (targets.length === 0) {
      window.alert('Nenhum concurso ativo para atualizar.')
      return
    }
    if (
      !window.confirm(
        `Atualizar ${targets.length} concursos ativos? Para cada um: adiciona os documentos novos nas Notícias e aplica automaticamente as mudanças detectadas (Fase 1 + Fase 2). Pode levar bastante tempo.`,
      )
    )
      return

    setUpdateReports([])
    setUpdatePhase({ running: true, done: 0, total: targets.length, current: null })
    const reports: Array<ConcursoUpdateReport> = []
    for (const t of targets) {
      // Sequencial, 1 request por concurso (cada um raspa + lê PDFs com IA).
      setUpdatePhase((p) => ({ ...p, current: t.institution }))
      try {
        reports.push(await scraperService.updateConcurso(t.id))
      } catch (err) {
        reports.push({
          concursoId: t.id,
          institution: t.institution,
          docsAdded: 0,
          docsAnalyzed: 0,
          itemsApplied: 0,
          changes: [],
          error: err instanceof ApiError ? err.message : 'Erro inesperado.',
        })
      }
      setUpdatePhase((p) => ({ ...p, done: p.done + 1 }))
    }
    setUpdateReports(reports)
    setUpdatePhase((p) => ({ ...p, running: false, current: null }))
    void queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
    void queryClient.invalidateQueries({ queryKey: ['concurso'] })
  }

  const searchError = searchMutation.error
    ? searchMutation.error instanceof ApiError
      ? searchMutation.error.message
      : 'Erro inesperado ao procurar concursos.'
    : null

  const { attention, concluded } = useMemo(() => {
    const rows = concursosQuery.data ?? []
    return {
      // Encerrados (closed) saem da atenção e vão para "Concluídos".
      attention: rows.filter(
        (r) => !r.closed && (r.status !== 'past' || r.needsSourceUrl),
      ),
      concluded: rows.filter(
        (r) => r.closed || (r.status === 'past' && !r.needsSourceUrl),
      ),
    }
  }, [concursosQuery.data])

  return (
    // Sem h-full/overflow próprio: o scroll é do div do layout _authenticated.
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Gerenciar concursos
          </h1>
          <p className="text-sm text-slate-500">
            Todos os concursos da base. Os que exigem manutenção (em andamento ou
            sem link oficial) ficam no topo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="contained"
            startIcon={<MagnifyingGlassIcon className="size-4" />}
            onClick={handleSearch}
            disabled={searchMutation.isPending}
          >
            {searchMutation.isPending ? 'Procurando...' : 'Procurar novos concursos'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowPathIcon className="size-4" />}
            onClick={handleReextract}
            disabled={reextractMutation.isPending}
            title="Re-visita a notícia + o site da banca de cada concurso e regrava o link do concurso"
          >
            {reextractMutation.isPending
              ? 'Recorrigindo...'
              : 'Recorrigir links oficiais'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudArrowDownIcon className="size-4" />}
            onClick={handleUpdate}
            disabled={updatePhase.running}
            title="Para cada concurso ativo: adiciona documentos novos nas Notícias e aplica as mudanças detectadas (Fase 1 + 2)"
          >
            {updatePhase.running ? 'Atualizando...' : 'Atualizar concursos'}
          </Button>
        </div>
      </div>

      {/* Progresso + relatório do "Atualizar concursos" */}
      {updatePhase.running && (
        <div className="animate-pulse rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
          Atualizando {updatePhase.done + 1}/{updatePhase.total}
          {updatePhase.current ? ` — ${updatePhase.current}` : ''}: adicionando
          documentos novos e aplicando mudanças...
        </div>
      )}
      {!updatePhase.running && updateReports.length > 0 && (
        <UpdateReportPanel
          reports={updateReports}
          onClose={() => setUpdateReports([])}
        />
      )}

      {/* Feedback do "recorrigir links" em massa */}
      {reextractMutation.isPending && (
        <div className="animate-pulse rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
          Re-visitando as notícias e os sites das bancas para achar o link de
          cada concurso — isso pode levar alguns minutos...
        </div>
      )}
      {reextractMutation.data && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Recorrigidos <strong>{reextractMutation.data.processed}</strong>{' '}
          concursos: <strong>{reextractMutation.data.updated}</strong> com link
          do concurso, <strong>{reextractMutation.data.stillMissing}</strong>{' '}
          ainda sem link (pegar manual).
        </div>
      )}
      {reextractMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {reextractMutation.error instanceof ApiError
            ? reextractMutation.error.message
            : 'Erro ao recorrigir os links.'}
        </div>
      )}

      {/* Painel de descoberta */}
      {panelOpen && (
        <DiscoveryPanel
          isPending={searchMutation.isPending}
          error={searchError}
          candidates={candidates}
          newCount={newCandidates.length}
          pendingCount={pendingNew.length}
          addState={addState}
          onAdd={handleAdd}
          onAddAll={handleAddAll}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* Listagem */}
      {concursosQuery.isPending ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Carregando concursos...
        </div>
      ) : concursosQuery.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não foi possível carregar os concursos.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <ConcursoSection
            title="Precisam de atenção"
            hint="Em andamento, inscrições abertas ou sem link oficial da organizadora. Os que estão há mais tempo sem verificação vêm primeiro."
            rows={attention}
            emptyLabel="Nenhum concurso pendente de manutenção."
          />
          <ConcursoSection
            title="Concluídos"
            rows={concluded}
            emptyLabel="Nenhum concurso concluído."
          />
        </div>
      )}
    </div>
  )
}

function DiscoveryPanel({
  isPending,
  error,
  candidates,
  newCount,
  pendingCount,
  addState,
  onAdd,
  onAddAll,
  onClose,
}: {
  isPending: boolean
  error: string | null
  candidates: Array<DiscoveryCandidate>
  newCount: number
  pendingCount: number
  addState: Record<string, AddState | undefined>
  onAdd: (c: DiscoveryCandidate) => void
  onAddAll: () => void
  onClose: () => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">
          Novos concursos no pciconcursos
        </span>
        <div className="flex items-center gap-3">
          {!isPending && newCount > 0 && (
            <Button
              size="small"
              variant="contained"
              onClick={onAddAll}
              disabled={pendingCount === 0}
            >
              {pendingCount === 0
                ? 'Todos adicionados'
                : `Adicionar ${pendingCount} novo${pendingCount > 1 ? 's' : ''}`}
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            fechar
          </button>
        </div>
      </div>

      {isPending ? (
        <div className="animate-pulse p-4 text-sm text-cyan-700">
          Raspando a página de enfermeiro do pciconcursos e cruzando com a base...
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-red-700">{error}</div>
      ) : candidates.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Nenhum concurso listado na página.
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {candidates.map((c) => (
            <CandidateRow
              key={c.newsUrl}
              candidate={c}
              state={addState[c.newsUrl]}
              onAdd={() => onAdd(c)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CandidateRow({
  candidate: c,
  state,
  onAdd,
}: {
  candidate: DiscoveryCandidate
  state: AddState | undefined
  onAdd: () => void
}) {
  const isExisting = c.status === 'exists'
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 ${
        isExisting ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-slate-800">
          <span className="font-medium">{c.institution}</span>
          {c.uf && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {c.uf}
            </span>
          )}
        </div>
        <a
          href={c.newsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-flex max-w-prose items-center gap-1 text-xs text-slate-400 hover:text-cyan-700"
        >
          <span className="truncate">{c.headline}</span>
          <ArrowTopRightOnSquareIcon className="size-3 shrink-0" />
        </a>
      </div>

      <div className="shrink-0">
        {isExisting ? (
          c.matched?.slug ? (
            <Link
              to="/concursos/$concursoSlug"
              params={{ concursoSlug: c.matched.slug }}
              className="text-xs text-slate-400 hover:text-cyan-700"
            >
              já cadastrado →
            </Link>
          ) : (
            <span className="text-xs text-slate-400">já cadastrado</span>
          )
        ) : (
          <CandidateAction state={state} onAdd={onAdd} />
        )}
      </div>
    </li>
  )
}

function CandidateAction({
  state,
  onAdd,
}: {
  state: AddState | undefined
  onAdd: () => void
}) {
  if (state === 'adding') {
    return (
      <span className="text-xs text-cyan-700 animate-pulse">adicionando...</span>
    )
  }
  if (state === 'done') {
    return <span className="text-xs font-medium text-emerald-600">✓ adicionado</span>
  }
  if (state === 'done-nolink') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <ExclamationTriangleIcon className="size-3.5" />
        sem link oficial — pegar manual
      </span>
    )
  }
  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-medium text-red-600 hover:underline"
      >
        falhou — tentar de novo
      </button>
    )
  }
  return (
    <Button size="small" variant="outlined" onClick={onAdd}>
      Adicionar
    </Button>
  )
}

function ConcursoSection({
  title,
  hint,
  rows,
  emptyLabel,
}: {
  title: string
  hint?: string
  rows: Array<AdminConcursoRow>
  emptyLabel: string
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className="text-xs text-slate-400">{rows.length}</span>
      </div>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-50">
          {rows.map((row) => (
            <ConcursoRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Data+hora exata da última verificação (só no title, para não poluir a linha). */
const checkStamp = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function ConcursoRow({ row }: { row: AdminConcursoRow }) {
  const closeMutation = useSetConcursoClosedMutation()
  // Quanto tempo faz que ninguém olha se este concurso publicou algo novo.
  // Encerrado não tem manutenção pendente, então não mostra nada.
  const freshness = row.closed ? null : checkFreshness(row.documentsCheckedAt)
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 ${
        row.closed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: row.slug ?? row.id }}
          className="truncate text-sm font-medium text-slate-800 hover:text-cyan-700"
        >
          {row.institution}
        </Link>
        {row.state && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            {row.state}
          </span>
        )}
        <span className="text-xs text-slate-400">{row.year}</span>
        {row.provaCount === 0 && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
            sem prova
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {freshness && (
          <span
            title={
              row.documentsCheckedAt != null
                ? `Última verificação: ${checkStamp.format(new Date(row.documentsCheckedAt))}`
                : 'As publicações deste concurso nunca foram verificadas'
            }
            className={`inline-flex items-center gap-1 text-xs ${
              freshness.stale ? 'font-medium text-amber-700' : 'text-slate-400'
            }`}
          >
            <ClockIcon className="size-3.5" />
            {freshness.label}
          </span>
        )}
        {!row.closed && row.needsSourceUrl && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <ExclamationTriangleIcon className="size-3.5" />
            sem link oficial
          </span>
        )}
        {row.closed ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Encerrado
          </span>
        ) : (
          <StatusPill status={row.status} label={STATUS_LABEL[row.status]} />
        )}
        <Link
          to="/admin/editar-concurso/$concursoId"
          params={{ concursoId: row.id }}
          aria-label={`Editar ${row.institution}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-700"
        >
          <PencilSquareIcon className="size-4" />
          Editar
        </Link>
        <button
          type="button"
          onClick={() =>
            closeMutation.mutate({ id: row.id, closed: !row.closed })
          }
          disabled={closeMutation.isPending}
          aria-label={`${row.closed ? 'Reabrir' : 'Fechar'} ${row.institution}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-700 disabled:opacity-50"
        >
          {row.closed ? (
            <>
              <ArrowUturnLeftIcon className="size-4" />
              Reabrir
            </>
          ) : (
            <>
              <ArchiveBoxIcon className="size-4" />
              Fechar
            </>
          )}
        </button>
      </div>
    </li>
  )
}

/** Relatório do "Atualizar concursos": totais + concursos com mudanças/erros. */
function UpdateReportPanel({
  reports,
  onClose,
}: {
  reports: Array<ConcursoUpdateReport>
  onClose: () => void
}) {
  const totalDocs = reports.reduce((s, r) => s + r.docsAdded, 0)
  const totalChanges = reports.reduce((s, r) => s + r.changes.length, 0)
  // Só mostra os concursos que tiveram algo (doc novo, mudança, erro ou skip).
  const notable = reports.filter(
    (r) => r.docsAdded > 0 || r.changes.length > 0 || r.error || r.skipped,
  )

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-emerald-900">
          Atualização concluída: <strong>{reports.length}</strong> concursos ·{' '}
          <strong>{totalDocs}</strong> documentos adicionados ·{' '}
          <strong>{totalChanges}</strong> campos alterados
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          fechar
        </button>
      </div>
      {notable.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {notable.map((r) => (
            <li
              key={r.concursoId}
              className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">
                  {r.institution}
                </span>
                {r.docsAdded > 0 && (
                  <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-xs text-cyan-700">
                    +{r.docsAdded} doc{r.docsAdded > 1 ? 's' : ''}
                  </span>
                )}
                {r.skipped && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {r.skipped === 'encerrado' ? 'encerrado' : 'sem página de origem'}
                  </span>
                )}
                {r.error && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <ExclamationTriangleIcon className="size-3.5" />
                    {r.error}
                  </span>
                )}
              </div>
              {r.changes.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {r.changes.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      <span className="text-slate-400">
                        {c.cargoRole ? `${c.cargoRole} · ` : ''}
                        {c.label}:
                      </span>{' '}
                      <span className="text-slate-400 line-through">
                        {c.oldValue ?? '—'}
                      </span>{' '}
                      → <span className="font-medium">{c.newValue ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
