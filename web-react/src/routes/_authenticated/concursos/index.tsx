import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import type {
  ConcursoListItem,
  ConcursoStatus,
} from '@/features/concurso/domain/concurso.types'
import { useConcursosQuery } from '@/features/concurso/queries/concurso.queries'
import { CARD } from '@/features/concurso/components/card'
import { enter } from '@/features/concurso/components/motion'
import { authService } from '@/features/auth/services/auth.service'
import { ApiError } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/concursos/')({
  component: ConcursosListPage,
})

/* ------------------------------------------------------------------ */
/*  Helpers de data/rótulo                                             */
/* ------------------------------------------------------------------ */

/* Datas do edital são date-only; formatamos em UTC (mesma convenção do
 * nível 1) para não derivar um dia pelo fuso. */
const monthYear = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

/** Dias de hoje (local) até a data UTC do edital; negativo = passado. */
function daysUntil(iso: string | null): number | null {
  if (iso == null) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const ms =
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      target.getUTCDate(),
    ) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round(ms / 86_400_000)
}

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

/**
 * Linha temporal do card, específica do estado (a "Data" vive aqui):
 * - aberto  → prazo de inscrição (+ data da prova); `urgent` quando ≤7 dias;
 * - futuro  → contagem para a prova;
 * - passado → mês/ano de aplicação.
 */
function temporalText(item: ConcursoListItem): { text: string; urgent: boolean } {
  const { timeline: t } = item
  if (item.status === 'open') {
    const exam = t.examDate != null ? ` · prova ${dayMonth.format(new Date(t.examDate))}` : ''
    const left = daysUntil(t.registrationEnd)
    if (left == null || left < 0) return { text: `Inscrições abertas${exam}`, urgent: false }
    if (left === 0) return { text: `Inscrições encerram hoje${exam}`, urgent: true }
    return {
      text: `Inscrições encerram em ${dias(left)}${exam}`,
      urgent: left <= 7,
    }
  }
  if (item.status === 'future') {
    const exam = t.examDate != null ? ` · ${dayMonth.format(new Date(t.examDate))}` : ''
    const left = daysUntil(t.examDate)
    if (left == null || left < 0) return { text: 'Prova em breve', urgent: false }
    if (left === 0) return { text: 'Prova hoje', urgent: true }
    return { text: `Prova em ${dias(left)}${exam}`, urgent: false }
  }
  const applied = t.examDate != null ? monthYear.format(new Date(t.examDate)) : null
  return { text: applied != null ? `Aplicada em ${applied}` : 'Prova aplicada', urgent: false }
}

/* Salário sem centavos, e a faixa larga sem repetir "R$" no segundo número:
 * "R$ 4.800 – 8.500" lê mais limpo que dois valores completos. */
const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function salaryRange(min: string | null, max: string | null): string | null {
  if (min == null || max == null) return null
  if (min === max) return compactCurrency.format(Number(min))
  const top = compactCurrency.format(Number(max)).replace(/^R\$\s?/, '')
  return `${compactCurrency.format(Number(min))} – ${top}`
}

function locationLabel(item: ConcursoListItem): string | null {
  if (item.city != null) {
    return `${item.city}${item.state != null ? `/${item.state}` : ''}`
  }
  return item.state
}

/** Cor da linha temporal: cyan p/ aberto (ação), âmbar na urgência de prazo
 *  (regra "tempo acabando" do DESIGN), slate p/ futuro, slate apagado p/ passado. */
function temporalClass(status: ConcursoStatus, urgent: boolean): string {
  if (status === 'open') {
    return urgent ? 'font-semibold text-amber-700' : 'font-semibold text-cyan-700'
  }
  if (status === 'future') return 'font-medium text-slate-600'
  return 'text-slate-500'
}

/* ------------------------------------------------------------------ */
/*  Filtros                                                            */
/* ------------------------------------------------------------------ */

/** Valor-sentinela do dropdown de Estado para "concursos federais" (sem UF). */
const FEDERAL = '__FEDERAL__'

/* O estado temporal vira um toggle nos filtros (segmented control): um estado
 * por vez, com contador em cada botão pra manter a visão geral. */
type StateTab = 'all' | ConcursoStatus

type TabIcon = ComponentType<SVGProps<SVGSVGElement>>

const TAB_OPTIONS: Array<{ value: StateTab; label: string; icon: TabIcon }> = [
  { value: 'all', label: 'Todas', icon: ListBulletIcon },
  { value: 'open', label: 'Abertas', icon: PencilSquareIcon },
  { value: 'future', label: 'A caminho', icon: CalendarDaysIcon },
  { value: 'past', label: 'Aplicadas', icon: CheckCircleIcon },
]

function StateToggle({
  value,
  onChange,
  counts,
}: {
  value: StateTab
  onChange: (v: StateTab) => void
  counts: Record<StateTab, number>
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-0.5 text-xs font-semibold text-slate-500">Mostrar</span>
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          role="group"
          aria-label="Filtrar por estado do concurso"
          className="inline-flex min-w-max gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
        >
          {TAB_OPTIONS.map((o) => {
            const active = value === o.value
            const Icon = o.icon
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(o.value)}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  active
                    ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-600' : 'text-slate-400'}`}
                />
                {o.label}
                <span
                  className={`text-xs font-bold tabular-nums ${active ? 'text-cyan-600' : 'text-slate-400'}`}
                >
                  {counts[o.value]}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

function ConcursosListPage() {
  const { data, isPending, error, refetch } = useConcursosQuery()
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })
  const isAdmin = profileData?.user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  /* Local: stateUf é uma UF, '' (todos) ou FEDERAL (concursos sem estado).
   * city só vale quando uma UF real está escolhida (cascata). */
  const [stateUf, setStateUf] = useState('')
  const [city, setCity] = useState('')
  const [boardId, setBoardId] = useState('')
  /* null = automático (cai na 1ª aba não-vazia, ex.: Abertas). */
  const [stateTab, setStateTab] = useState<StateTab | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const all = useMemo(() => data?.concursos ?? [], [data])

  /* Base p/ as opções de faceta: só a busca textual (o universo é pequeno;
   * filtragem client-side dá contador instantâneo). O endpoint também aceita
   * os mesmos filtros server-side, cobertos por e2e. */
  const searchBase = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (c) =>
        c.institution.toLowerCase().includes(q) ||
        (c.examBoard?.name ?? '').toLowerCase().includes(q) ||
        (c.examBoard?.alias ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q),
    )
  }, [all, search])

  /* Estado: UFs com contador + uma opção "Federais" (governmentScope FEDERAL,
   * que não tem estado) quando houver. Resolve a incoerência Âmbito×Local. */
  const stateOptions = useMemo<Array<FilterOption>>(() => {
    const map = new Map<string, number>()
    let federal = 0
    for (const c of searchBase) {
      if (c.governmentScope === 'FEDERAL') federal++
      else if (c.state) map.set(c.state, (map.get(c.state) ?? 0) + 1)
    }
    const ufs = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([uf, count]) => ({ value: uf, label: uf, count }))
    return federal > 0
      ? [{ value: FEDERAL, label: 'Federais', count: federal }, ...ufs]
      : ufs
  }, [searchBase])

  /* Cidade: em cascata, só as cidades da UF escolhida (vazio = dropdown some). */
  const cityOptions = useMemo<Array<FilterOption>>(() => {
    if (!stateUf || stateUf === FEDERAL) return []
    const map = new Map<string, number>()
    for (const c of searchBase) {
      if (c.state === stateUf && c.city) {
        map.set(c.city, (map.get(c.city) ?? 0) + 1)
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ value: name, label: name, count }))
  }, [searchBase, stateUf])

  const boardOptions = useMemo<Array<FilterOption>>(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const c of searchBase)
      if (c.examBoard) {
        const ex = map.get(c.examBoard.id)
        if (ex) ex.count++
        else
          map.set(c.examBoard.id, {
            label: c.examBoard.alias ?? c.examBoard.name,
            count: 1,
          })
      }
    return [...map.entries()]
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([value, { label, count }]) => ({ value, label, count }))
  }, [searchBase])

  /* Trocar de UF zera a cidade (a anterior pode não existir na nova UF). */
  const changeState = (v: string) => {
    setStateUf(v)
    setCity('')
  }

  const filtered = useMemo(() => {
    let list = searchBase
    if (stateUf === FEDERAL) {
      list = list.filter((c) => c.governmentScope === 'FEDERAL')
    } else if (stateUf) {
      list = list.filter((c) => c.state === stateUf)
      if (city) list = list.filter((c) => c.city === city)
    }
    if (boardId) list = list.filter((c) => c.examBoard?.id === boardId)
    return list
  }, [searchBase, stateUf, city, boardId])

  /* Contadores por aba (sobre o conjunto já filtrado por busca/faceta). */
  const counts = useMemo<Record<StateTab, number>>(() => {
    const c = { all: filtered.length, open: 0, future: 0, past: 0 }
    for (const item of filtered) c[item.status]++
    return c
  }, [filtered])

  /* Aba ativa: a escolha explícita do usuário ou, em automático, a 1ª não-vazia
   * (Abertas → A caminho → Aplicadas) pra nunca cair numa lista vazia. */
  const autoTab: StateTab =
    counts.open > 0
      ? 'open'
      : counts.future > 0
        ? 'future'
        : counts.past > 0
          ? 'past'
          : 'all'
  const activeTab = stateTab ?? autoTab

  const displayed = useMemo(
    () =>
      activeTab === 'all'
        ? filtered
        : filtered.filter((c) => c.status === activeTab),
    [filtered, activeTab],
  )

  /* Volta a paginação ao topo quando a aba/filtros mudam. */
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [activeTab, stateUf, city, boardId, search])

  const hasActiveFilters = !!stateUf || !!city || !!boardId || !!search.trim()

  const clearFilters = () => {
    setStateUf('')
    setCity('')
    setBoardId('')
    setSearch('')
  }

  const openCount = all.filter((c) => c.status === 'open').length

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* ░░ Cabeçalho ░░ */}
      <header {...enter(0)} className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Concursos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Encontre o edital certo e entre no cargo para se preparar.
            {!isPending && all.length > 0 && (
              <span className="text-slate-400">
                {' '}
                · {all.length} {all.length === 1 ? 'concurso' : 'concursos'}
                {openCount > 0 && ` · ${openCount} com inscrições abertas`}
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/exams"
            search={{ board: undefined }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 no-underline transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Gerenciar provas
          </Link>
        )}
      </header>

      {/* ░░ Filtros ░░ */}
      <div {...enter(1)} className="flex flex-col gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por instituição, banca ou cidade…"
            aria-label="Buscar concursos"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stateOptions.length > 0 && (
            <FilterDropdown
              label="Estado"
              value={stateUf}
              options={stateOptions}
              onChange={changeState}
              allLabel="Todos os estados"
            />
          )}
          {cityOptions.length > 0 && (
            <FilterDropdown
              label="Cidade"
              value={city}
              options={cityOptions}
              onChange={setCity}
              allLabel="Todas as cidades"
            />
          )}
          {boardOptions.length > 0 && (
            <FilterDropdown
              label="Banca"
              value={boardId}
              options={boardOptions}
              onChange={setBoardId}
              allLabel="Todas as bancas"
              searchable
            />
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-600"
            >
              <XMarkIcon className="h-4 w-4" />
              Limpar
            </button>
          )}
        </div>

        {/* Seletor de estado por último, logo antes da lista. */}
        <StateToggle value={activeTab} onChange={setStateTab} counts={counts} />
      </div>

      {/* ░░ Lista ░░ */}
      {isPending ? (
        <ListSkeleton />
      ) : error != null ? (
        <ListErrorState error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
      ) : displayed.length === 0 ? (
        <TabEmpty tab={activeTab} />
      ) : (
        <section aria-label="Concursos" className="flex flex-col gap-2.5">
          {displayed.slice(0, limit).map((item, i) => (
            <ConcursoCard key={item.slug} item={item} enterIdx={Math.min(i, 6) + 2} />
          ))}
          {displayed.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="mt-1 inline-flex items-center justify-center gap-1 self-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <ChevronDownIcon className="h-4 w-4" />
              Ver mais ({displayed.length - limit})
            </button>
          )}
        </section>
      )}
    </div>
  )
}

/** Tamanho da página da lista plana ("Ver mais" carrega mais um bloco). */
const PAGE_SIZE = 24

/* ------------------------------------------------------------------ */
/*  Vazio por aba (estado selecionado sem itens)                      */
/* ------------------------------------------------------------------ */

function TabEmpty({ tab }: { tab: StateTab }) {
  const msg =
    tab === 'open'
      ? 'Nenhuma inscrição aberta no momento.'
      : tab === 'future'
        ? 'Nenhuma prova a caminho no momento.'
        : 'Nada por aqui.'
  return (
    <section
      {...enter(2)}
      className={`${CARD} flex flex-col items-center gap-2 p-8 text-center`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
        <MagnifyingGlassIcon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{msg}</p>
      <p className="text-xs text-slate-500">
        Troque o filtro acima para ver os outros estados.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Select de filtro (nativo, estilizado)                              */
/* ------------------------------------------------------------------ */

type FilterOption = { value: string; label: string; count?: number }

/** Dropdown de filtro: trigger estilizado + popover com contador, check e
 *  (opcional) busca interna. Fecha em clique-fora, Escape ou ao escolher. */
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  allLabel,
  searchable = false,
}: {
  label: string
  value: string
  options: Array<FilterOption>
  onChange: (value: string) => void
  allLabel: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = options.find((o) => o.value === value) ?? null
  const q = query.trim().toLowerCase()
  const visible =
    searchable && q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-white py-1.5 pl-3 pr-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
          value
            ? 'border-cyan-300 text-cyan-700'
            : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        {selected != null ? (
          <>
            <span className="font-medium text-slate-400">{label}:</span>
            {selected.label}
          </>
        ) : (
          label
        )}
        <ChevronUpDownIcon className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}…`}
                aria-label={`Buscar ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          )}
          <div className="max-h-64 overflow-auto py-1">
            <DropdownOption
              label={allLabel}
              active={value === ''}
              onClick={() => choose('')}
            />
            {visible.map((o) => (
              <DropdownOption
                key={o.value}
                label={o.label}
                count={o.count}
                active={o.value === value}
                onClick={() => choose(o.value)}
              />
            ))}
            {visible.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">Nenhuma opção</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
        active
          ? 'bg-cyan-50 font-semibold text-cyan-700'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <CheckIcon
        className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-600' : 'text-transparent'}`}
      />
      <span className="flex-1 truncate">{label}</span>
      {count != null && (
        <span
          className={`text-xs tabular-nums ${active ? 'text-cyan-600' : 'text-slate-400'}`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Card de concurso — o card inteiro navega para o nível 1            */
/* ------------------------------------------------------------------ */

function ConcursoCard({ item, enterIdx }: { item: ConcursoListItem; enterIdx: number }) {
  const location = locationLabel(item)
  const salary = salaryRange(item.salaryMin, item.salaryMax)
  const temporal = temporalText(item)

  const e = enter(enterIdx)
  /* Rows uniformes (o toggle de estado vive nos filtros); a linha 2 mantém a
   * cor semântica do tempo. Linha 1 = onde · quem + salário (âncora à direita).
   * O <Link> cobre a linha inteira. */
  return (
    <article
      style={e.style}
      className={`${e.className} group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_6px_16px_-6px_rgba(15,23,42,0.12)] focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2`}
    >
      <Link
        to="/concursos/$concursoSlug"
        params={{ concursoSlug: item.slug }}
        aria-label={`Ver concurso ${item.institution} ${item.year}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none"
      />

      <div className="min-w-0 flex-1">
        {/* Linha 1: onde (destaque) · quem … salário (âncora à direita) */}
        <div className="flex items-center gap-1.5">
          {location != null && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-700">
              <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
              {location}
            </span>
          )}
          {location != null && (
            <span aria-hidden className="shrink-0 text-slate-300">
              ·
            </span>
          )}
          <h3 className="min-w-0 truncate text-[0.9375rem] font-bold leading-tight text-slate-700 transition-colors group-hover:text-cyan-700">
            {item.institution}
          </h3>
          {salary != null && (
            <span className="ml-auto shrink-0 text-sm font-bold tabular-nums text-slate-700">
              {salary}
            </span>
          )}
        </div>
        {/* Linha 2: o tempo (específico do estado) */}
        <p
          className={`mt-1 truncate text-xs leading-tight ${temporalClass(item.status, temporal.urgent)}`}
        >
          {temporal.text}
        </p>
      </div>

      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Estados: skeleton, vazio, erro                                     */
/* ------------------------------------------------------------------ */

function ListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando concursos"
      className="flex flex-col gap-2.5"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3.5"
        >
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200/70" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200/60" />
        </div>
      ))}
      <span className="sr-only">Carregando concursos…</span>
    </div>
  )
}

function EmptyState({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean
  onClear: () => void
}) {
  return (
    <section
      {...enter(2)}
      className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
        <MagnifyingGlassIcon className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-base font-bold text-slate-900">
          {hasActiveFilters ? 'Nenhum concurso com esses filtros' : 'Nenhum concurso disponível'}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {hasActiveFilters
            ? 'Tente afrouxar a busca ou remover algum filtro.'
            : 'Assim que novos concursos de enfermagem forem adicionados, eles aparecem aqui.'}
        </p>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Limpar filtros
        </button>
      )}
    </section>
  )
}

function ListErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const notFound = error instanceof ApiError && error.status === 404
  return (
    <section
      {...enter(2)}
      className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
        <BuildingLibraryIcon className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          {notFound ? 'Nada por aqui' : 'Não foi possível carregar os concursos'}
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Algo deu errado ao buscar os dados. Tente novamente em instantes.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Tentar novamente
      </button>
    </section>
  )
}
