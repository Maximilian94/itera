import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlayIcon,
  TicketIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import type {
  CargoSummary,
  ConcursoDetail,
  ConcursoStatus,
  ConcursoTimeline,
} from '@/features/concurso/domain/concurso.types'
import type {FichaFact} from '@/features/concurso/components/FichaCard';
import { useConcursoQuery } from '@/features/concurso/queries/concurso.queries'
import { CARD, CARD_RAISE } from '@/features/concurso/components/card'
import { enter, useMeters } from '@/features/concurso/components/motion'
import { StatusPill } from '@/features/concurso/components/StatusPill'
import { InstitutionMark } from '@/features/concurso/components/InstitutionMark'
import {
  FichaCard
  
} from '@/features/concurso/components/FichaCard'
import {
  VerticalTimeline,
  buildConcursoTimelineSteps,
} from '@/features/concurso/components/VerticalTimeline'
import { ReadinessBar } from '@/features/concurso/components/ReadinessBar'
import { useStartSimuladoMutation } from '@/features/concurso/hooks/useStartSimulado'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { ApiError } from '@/lib/api'
import { formatBRL } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/concursos/$concursoSlug/')({
  component: ConcursoPage,
})

/* ------------------------------------------------------------------ */
/*  Helpers de data/rótulo                                             */
/* ------------------------------------------------------------------ */

/* Datas do edital são date-only; formatamos em UTC para não derivar
 * um dia pelo fuso (mesma convenção do VerticalTimeline). */
const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const fmt = (iso: string | null, formatter: Intl.DateTimeFormat) =>
  iso != null ? formatter.format(new Date(iso)) : null

/** Dias de hoje (local) até a data UTC do edital; negativo = passado. */
function daysUntil(iso: string | null): number | null {
  if (iso == null) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const ms =
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round(ms / 86_400_000)
}

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

/** Texto da pill por status; o enquadramento temporal é da rota. */
function statusLabel(status: ConcursoStatus, timeline: ConcursoTimeline): string {
  if (status === 'open') {
    const left = daysUntil(timeline.registrationEnd)
    if (left == null || left < 0) return 'Inscrições abertas'
    if (left === 0) return 'Inscrições abertas · encerram hoje'
    return `Inscrições abertas · encerram em ${dias(left)}`
  }
  if (status === 'future') {
    const left = daysUntil(timeline.examDate)
    if (left == null || left < 0) return 'Prova em breve'
    if (left === 0) return 'Prova hoje'
    return `Prova em ${dias(left)}`
  }
  const applied = fmt(timeline.examDate, fullDate)
  return applied != null ? `Prova aplicada em ${applied}` : 'Prova aplicada'
}

/** "70 vagas de enfermagem", com singular e cadastro de reserva. */
function vacancyLine(vacancyTotal: number, hasCR: boolean): string | null {
  if (vacancyTotal > 0) {
    return `${vacancyTotal} ${vacancyTotal === 1 ? 'vaga' : 'vagas'} de enfermagem${hasCR ? ' + CR' : ''}`
  }
  return hasCR ? 'Cadastro de reserva' : null
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function ConcursoPage() {
  const { concursoSlug } = Route.useParams()
  const { data, isPending, error, refetch } = useConcursoQuery(concursoSlug)

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Breadcrumb
        current={
          data != null ? `${data.concurso.institution} · ${data.concurso.year}` : null
        }
      />
      {isPending ? (
        <ConcursoSkeleton />
      ) : error != null ? (
        <ConcursoErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <ConcursoContent data={data} />
      )}
    </div>
  )
}

function Breadcrumb({ current }: { current: string | null }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        <li>
          <Link
            to="/exams"
            search={{ board: undefined }}
            className="font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
          >
            Concursos
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
          {current != null ? (
            <span className="truncate font-semibold text-slate-900">{current}</span>
          ) : (
            <span
              aria-hidden
              className="h-4 w-40 animate-pulse rounded bg-slate-200"
            />
          )}
        </li>
      </ol>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Conteúdo (dados carregados)                                        */
/* ------------------------------------------------------------------ */

function ConcursoContent({ data }: { data: ConcursoDetail }) {
  const { concurso, cargos } = data
  const meters = useMeters()
  const { status, timeline, summary } = concurso

  /* "Começar" no card inicia o simulado da prova do cargo (MAX-24). Só é
   * possível quando a prova tem questões e banca — senão o card continua
   * navegando para o nível 2, onde o CTA resolve a prova alvo. */
  const { requireAccess } = useRequireAccess()
  const startSimulado = useStartSimuladoMutation()
  const boardId = concurso.examBoard?.id ?? null
  const startingCargoId = startSimulado.isPending
    ? startSimulado.variables.examBaseId
    : null
  const handleStartCargo = (cargo: CargoSummary) => {
    if (boardId == null || !requireAccess()) return
    startSimulado.mutate({ examBoardId: boardId, examBaseId: cargo.id })
  }

  const bancaName = concurso.examBoard?.alias ?? concurso.examBoard?.name ?? null
  const location =
    concurso.city != null
      ? `${concurso.city}${concurso.state != null ? ` / ${concurso.state}` : ''}`
      : concurso.state

  const contextLine = [bancaName, vacancyLine(summary.vacancyTotal, summary.hasCR), location]
    .filter((p): p is string => p != null)
    .join(' · ')

  const regStart = fmt(timeline.registrationStart, dayMonth)
  const regEnd = fmt(timeline.registrationEnd, fullDate)
  const registration =
    regStart != null && regEnd != null
      ? `${regStart} a ${regEnd}`
      : regEnd != null
        ? `até ${regEnd}`
        : regStart != null
          ? `a partir de ${fmt(timeline.registrationStart, fullDate)}`
          : null

  const fichaHero: FichaFact = {
    icon: CalendarDaysIcon,
    label: 'Prova objetiva',
    value: fmt(timeline.examDate, fullDate),
  }
  const ficha: Array<FichaFact> = [
    { icon: BuildingLibraryIcon, label: 'Banca', value: bancaName },
    { icon: PencilSquareIcon, label: 'Inscrições', value: registration },
    {
      icon: TicketIcon,
      label: 'Taxa de inscrição',
      value: summary.registrationFee != null ? formatBRL(summary.registrationFee) : null,
    },
    { icon: MapPinIcon, label: 'Cidade', value: location },
    {
      icon: UsersIcon,
      label: 'Vagas de enfermagem',
      value:
        summary.vacancyTotal > 0
          ? `${summary.vacancyTotal}${summary.hasCR ? ' + cadastro reserva' : ''}`
          : summary.hasCR
            ? 'Cadastro de reserva'
            : null,
    },
  ]

  const timelineSteps = buildConcursoTimelineSteps(timeline, status)
  const hasTimeline = timelineSteps.some((s) => s.date != null)
  const registrationDaysLeft = daysUntil(timeline.registrationEnd)

  return (
    <>
      {/* ░░ Cabeçalho do concurso ░░ */}
      <header {...enter(0)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <InstitutionMark institution={concurso.institution} />
            <div className="min-w-0 max-w-prose">
              <StatusPill status={status} label={statusLabel(status, timeline)} />
              <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Concurso {concurso.institution} {concurso.year}
              </h1>
              {contextLine !== '' && (
                <p className="mt-1 text-sm text-slate-500">{contextLine}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {concurso.editalUrl != null && (
              <a
                href={concurso.editalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 no-underline transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Edital
              </a>
            )}
            {status === 'open' && concurso.editalUrl != null && (
              <a
                href={concurso.editalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_4px_12px_-2px_rgba(8,145,178,0.4)] transition-all hover:bg-cyan-700 hover:shadow-[0_6px_16px_-2px_rgba(8,145,178,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                Inscrever-se
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* ░░ Coluna principal — escolha do cargo ░░ */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          {cargos.length === 0 ? (
            <EmptyCargos />
          ) : (
            <section aria-labelledby="cargos-heading" className="flex flex-col gap-3">
              <div {...enter(1)}>
                <h2 id="cargos-heading" className="text-base font-bold text-slate-900">
                  Escolha seu cargo
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Conteúdo, concorrência e nota de corte mudam por cargo. Entre no seu
                  para ver os detalhes e treinar.
                </p>
              </div>

              {cargos.map((cargo, i) => (
                <CargoCard
                  key={cargo.id}
                  cargo={cargo}
                  concursoSlug={concurso.slug ?? concurso.id}
                  canStart={boardId != null && cargo.questionCount > 0}
                  isStarting={startingCargoId === cargo.id}
                  onStart={() => handleStartCargo(cargo)}
                  meters={meters}
                  enterIdx={2 + i}
                />
              ))}
            </section>
          )}
        </div>

        {/* ░░ Sidebar — ficha do concurso + cronograma ░░ */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <FichaCard
            title="Ficha do concurso"
            hero={fichaHero}
            rows={ficha}
            editalUrl={concurso.editalUrl}
            enterIdx={2}
          />

          {hasTimeline && (
            <section
              aria-labelledby="cronograma-heading"
              {...{ style: enter(3).style }}
              className={`${enter(3).className} ${CARD} p-5`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="cronograma-heading" className="text-sm font-bold text-slate-900">
                  Cronograma
                </h2>
                {status === 'open' &&
                  registrationDaysLeft != null &&
                  registrationDaysLeft >= 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {registrationDaysLeft === 0 ? 'hoje' : dias(registrationDaysLeft)}
                    </span>
                  )}
              </div>
              <VerticalTimeline steps={timelineSteps} />
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Card de cargo — o card inteiro navega para o nível 2               */
/* ------------------------------------------------------------------ */

function CargoCard(props: {
  cargo: CargoSummary
  concursoSlug: string
  /** Prova com questões e banca → "Começar" inicia o simulado direto. */
  canStart: boolean
  isStarting: boolean
  onStart: () => void
  meters: boolean
  enterIdx: number
}) {
  const { cargo, concursoSlug, canStart, isStarting, onStart, meters, enterIdx } = props
  const score =
    cargo.userStats.bestScore != null ? Math.round(cargo.userStats.bestScore) : null
  const cut =
    cargo.minPassingGrade != null && Number.isFinite(Number(cargo.minPassingGrade))
      ? Math.round(Number(cargo.minPassingGrade))
      : null
  const passing = score != null && cut != null && score >= cut

  const meta = [
    cargo.vacancyCount != null
      ? `${cargo.vacancyCount} ${cargo.vacancyCount === 1 ? 'vaga' : 'vagas'}${cargo.hasReserveList ? ' + CR' : ''}`
      : cargo.hasReserveList
        ? 'Cadastro de reserva'
        : null,
    cargo.workload,
    cargo.questionCount > 0 ? `${cargo.questionCount} questões na prova` : null,
  ]
    .filter((p): p is string => p != null)
    .join(' · ')

  const e = enter(enterIdx)
  /* Stretched link: o <Link> absoluto cobre o card inteiro (nível 2); o botão
   * "Começar" fica acima dele (z-10) sem aninhar interativo em interativo. */
  return (
    <article
      style={e.style}
      className={`${e.className} ${CARD} ${CARD_RAISE} group relative p-5 text-left hover:border-cyan-200 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 sm:p-6`}
    >
      <Link
        to="/concursos/$concursoSlug/$cargoSlug"
        params={{ concursoSlug, cargoSlug: cargo.slug ?? cargo.id }}
        aria-label={`Ver detalhes do cargo ${cargo.role}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none"
      />
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-700">
            {cargo.role}
          </p>
          {meta !== '' && <p className="mt-1 text-sm text-slate-500">{meta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {cargo.salaryBase != null && (
            <div className="text-right">
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
                {formatBRL(cargo.salaryBase)}
              </p>
              <p className="text-xs text-slate-500">salário base</p>
            </div>
          )}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all group-hover:bg-cyan-50 group-hover:text-cyan-600">
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3.5">
        {score != null ? (
          <div className="flex items-center gap-4">
            {/* emerald-700: texto pequeno precisa de ≥4.5:1 sobre branco (AA);
                emerald-600 fica em ~3.7. */}
            <span
              className={`shrink-0 text-sm font-extrabold tabular-nums ${
                cut == null
                  ? 'text-slate-900'
                  : passing
                    ? 'text-emerald-700'
                    : 'text-rose-600'
              }`}
            >
              {score}%
            </span>
            <ReadinessBar
              value={score}
              cut={cut}
              meters={meters}
              size="sm"
              className="min-w-0 flex-1"
            />
            <span
              className={`shrink-0 text-xs font-semibold ${
                cut == null
                  ? 'text-slate-500'
                  : passing
                    ? 'text-emerald-700'
                    : 'text-rose-600'
              }`}
            >
              {cut == null
                ? 'melhor nota'
                : passing
                  ? 'Acima do corte'
                  : `${cut - score} pt para o corte`}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Você ainda não treinou para este cargo
            </span>
            {canStart ? (
              <button
                type="button"
                onClick={onStart}
                disabled={isStarting}
                className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-wait disabled:opacity-70"
              >
                <PlayIcon className="h-4 w-4" />
                {isStarting ? 'Iniciando…' : 'Começar'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700">
                <PlayIcon className="h-4 w-4" />
                Começar
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Estados: vazio, skeleton, erro/404                                 */
/* ------------------------------------------------------------------ */

/** Concurso sem nenhum cargo de enfermagem publicado. */
function EmptyCargos() {
  const e = enter(1)
  return (
    <section
      style={e.style}
      className={`${e.className} ${CARD} flex flex-col items-center gap-3 p-8 text-center sm:p-10`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
        <BriefcaseIcon className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Ainda não temos as provas deste concurso
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Assim que as provas de enfermagem forem adicionadas, elas aparecem aqui.
          Enquanto isso, treine com outro concurso.
        </p>
      </div>
      <Link
        to="/exams"
        search={{ board: undefined }}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
      >
        Ver outros concursos
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </section>
  )
}

/** Silhueta do layout (header + 2 cards + sidebar) enquanto carrega. */
function ConcursoSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-slate-200/70'
  return (
    <div role="status" aria-label="Carregando concurso" className="contents">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`h-12 w-12 sm:h-14 sm:w-14 ${block}`} />
          <div className="flex flex-col gap-2">
            <div className={`h-6 w-44 rounded-full ${block}`} />
            <div className={`h-8 w-72 max-w-full ${block}`} />
            <div className={`h-4 w-56 max-w-full ${block}`} />
          </div>
        </div>
        <div className={`h-10 w-28 ${block}`} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className={`h-10 w-2/3 ${block}`} />
          <div className={`h-36 ${block}`} />
          <div className={`h-36 ${block}`} />
        </div>
        <div className="flex flex-col gap-4">
          <div className={`h-80 ${block}`} />
          <div className={`h-48 ${block}`} />
        </div>
      </div>
      <span className="sr-only">Carregando concurso…</span>
    </div>
  )
}

/** 404 (concurso inexistente) ou falha de rede, com volta para /exams. */
function ConcursoErrorState(props: { error: unknown; onRetry: () => void }) {
  const notFound = props.error instanceof ApiError && props.error.status === 404
  return (
    <section
      {...enter(0)}
      className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
        <MagnifyingGlassIcon className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          {notFound ? 'Concurso não encontrado' : 'Não foi possível carregar o concurso'}
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {notFound
            ? 'O concurso que você procura não existe ou foi removido.'
            : 'Algo deu errado ao buscar os dados. Tente novamente em instantes.'}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {!notFound && (
          <button
            type="button"
            onClick={props.onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Tentar novamente
          </button>
        )}
        <Link
          to="/exams"
          search={{ board: undefined }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
            notFound
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
          }`}
        >
          Ver todos os concursos
        </Link>
      </div>
    </section>
  )
}
