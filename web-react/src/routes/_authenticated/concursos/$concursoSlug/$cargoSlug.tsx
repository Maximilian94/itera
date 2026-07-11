import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  TicketIcon,
  UsersIcon,
  ViewfinderCircleIcon,
} from '@heroicons/react/24/outline'
import type {
  CargoDetail,
  CargoPreviousExam,
  CompetitionHistory,
  ConcursoStatus,
  StudyPlan,
} from '@/features/concurso/domain/concurso.types'
import type { FichaFact } from '@/features/concurso/components/FichaCard'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import type { ProvaTrainOption } from '@/features/concurso/components/treino/ProvasBoard'
import {
  useCargoQuery,
  useCompetitionHistoryQuery,
  useSubjectDistributionQuery,
} from '@/features/concurso/queries/concurso.queries'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import { TrainingFlow } from '@/features/concurso/components/treino/TrainingFlow'
import { ProvasBoard } from '@/features/concurso/components/treino/ProvasBoard'
import { CARD } from '@/features/concurso/components/card'
import { enter, useMeters } from '@/features/concurso/components/motion'
import { StatusPill } from '@/features/concurso/components/StatusPill'
import { InstitutionMark } from '@/features/concurso/components/InstitutionMark'
import { FichaCard } from '@/features/concurso/components/FichaCard'
import { SubjectDistribution } from '@/features/concurso/components/SubjectDistribution'
import { ApiError } from '@/lib/api'
import { formatBRL } from '@/lib/utils'

export const Route = createFileRoute(
  '/_authenticated/concursos/$concursoSlug/$cargoSlug',
)({
  component: CargoPage,
})

/* ------------------------------------------------------------------ */
/*  Helpers de data/rótulo                                             */
/* ------------------------------------------------------------------ */

/* Datas do edital são date-only; formatamos em UTC para não derivar
 * um dia pelo fuso (mesma convenção do nível 1). */
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const integer = new Intl.NumberFormat('pt-BR')

const fmtDate = (iso: string | null) => {
  if (iso == null) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : fullDate.format(d)
}

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

/** Texto da pill por status; sem datas de inscrição no payload do cargo. */
function statusLabel(status: ConcursoStatus, examDate: string | null): string {
  if (status === 'open') return 'Inscrições abertas'
  if (status === 'future') {
    const left = daysUntil(examDate)
    if (left == null || left < 0) return 'Prova em breve'
    if (left === 0) return 'Prova hoje'
    return `Prova em ${left} ${left === 1 ? 'dia' : 'dias'}`
  }
  const applied = fmtDate(examDate)
  return applied != null ? `Prova aplicada em ${applied}` : 'Prova aplicada'
}

/** "2022 e 2019" / "2023, 2022 e 2019" para o subtítulo histórico. */
function listYears(years: Array<number>): string {
  const sorted = [...years].sort((a, b) => b - a)
  if (sorted.length <= 1) return sorted.join('')
  return `${sorted.slice(0, -1).join(', ')} e ${sorted[sorted.length - 1]}`
}

const toPercent = (decimal: string | null): number | null => {
  if (decimal == null) return null
  const n = Number(decimal)
  return Number.isFinite(n) ? Math.round(n) : null
}

/* ------------------------------------------------------------------ */
/*  Opções de treino                                                   */
/* ------------------------------------------------------------------ */

/** Uma opção de treino: ou uma prova própria do cargo (com questões, prova
 *  passada) ou uma prova relacionada recomendada. */
type TrainingOption = {
  examBaseId: string
  /** Banca da própria prova (relacionadas tier 2 são de outra banca). */
  examBoardId: string | null
  studyPlan: StudyPlan
  questionCount: number
  userStats: { attemptCount: number; bestScore: number | null }
  kind: 'own' | 'related'
  /** Linha principal do item (ex.: "Tipo 1" ou "CEBRASPE · 2024"). */
  label: string
  /** Linha secundária (ex.: instituição da prova relacionada). */
  sublabel: string | null
}

/** Monta as opções de treino: provas próprias COM questões (prova passada)
 *  primeiro, depois as relacionadas (já ordenadas tier1→tier2 pelo backend).
 *  Prova futura → próprias sem questões caem fora, sobra só o relacionado. */
function buildTrainingOptions(data: CargoDetail): Array<TrainingOption> {
  const boardId = data.concurso.examBoard?.id ?? null
  const own: Array<TrainingOption> = data.provas
    .filter((p) => p.questionCount > 0)
    .map((p) => ({
      examBaseId: p.examBaseId,
      examBoardId: boardId,
      studyPlan: p.studyPlan,
      questionCount: p.questionCount,
      userStats: p.userStats,
      kind: 'own',
      label: p.label ?? 'Esta prova',
      sublabel: null,
    }))
  const related: Array<TrainingOption> = data.relatedProvas.map((r) => ({
    examBaseId: r.examBaseId,
    examBoardId: r.examBoardId,
    studyPlan: r.studyPlan,
    questionCount: r.questionCount,
    userStats: r.userStats,
    kind: 'related',
    label: `${r.examBoardAlias ?? 'Banca'} · ${r.year}`,
    sublabel: r.institution,
  }))
  return [...own, ...related]
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function CargoPage() {
  const { concursoSlug, cargoSlug } = Route.useParams()
  const { data, isPending, error, refetch } = useCargoQuery(concursoSlug, cargoSlug)

  const concursoLabel =
    data != null ? `${data.concurso.institution} · ${data.concurso.year}` : null

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Back-link ao concurso — o título do concurso encolhe até aqui
       * (view transition compartilhada). */}
      <Link
        to="/concursos/$concursoSlug"
        params={{ concursoSlug }}
        viewTransition
        style={{ viewTransitionName: 'concurso-heading' }}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
      >
        <ChevronLeftIcon className="h-4 w-4 shrink-0" />
        {concursoLabel != null ? (
          <span className="truncate">{concursoLabel}</span>
        ) : (
          <span aria-hidden className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        )}
      </Link>
      {isPending ? (
        <CargoSkeleton />
      ) : error != null ? (
        <CargoErrorState
          error={error}
          concursoSlug={concursoSlug}
          onRetry={() => refetch()}
        />
      ) : (
        <CargoContent data={data} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Conteúdo (dados carregados)                                        */
/* ------------------------------------------------------------------ */

function CargoContent({ data }: { data: CargoDetail }) {
  const { concurso, cargo, syllabusGroups, previousExams } = data
  const meters = useMeters()

  /* Opções de treino: a(s) prova(s) própria(s) COM questões (prova passada) +
   * as provas relacionadas (mesma banca/cargo, depois mesmo cargo de outra
   * banca). Prova futura não tem questões próprias → só relacionadas. CADA
   * opção vira um programa de treino próprio (ProgramCard), todos visíveis. */
  const trainingOptions = buildTrainingOptions(data)
  // Bloco de matérias/concorrência usa a 1ª opção (recomendação principal).
  const referenceExamBaseId = trainingOptions[0]?.examBaseId ?? cargo.id

  const subjectQuery = useSubjectDistributionQuery(referenceExamBaseId)
  const competitionQuery = useCompetitionHistoryQuery(cargo.id)

  // Treino mais recente por prova: como a lista vem por updatedAt desc, a 1ª
  // ocorrência de cada examBaseId é a sessão mais recente daquela prova.
  const trainingsQuery = useTrainingsQuery()
  const latestTrainingByExamBase = (() => {
    const map = new Map<string, TrainingListItem>()
    for (const t of trainingsQuery.data ?? []) {
      if (!map.has(t.examBaseId)) map.set(t.examBaseId, t)
    }
    return map
  })()

  // Treino em andamento (não concluído) de alguma prova deste cargo → selo na aba.
  const cargoExamBaseIds = new Set([
    ...data.provas.map((p) => p.examBaseId),
    ...data.relatedProvas.map((r) => r.examBaseId),
  ])
  const activeTraining = (trainingsQuery.data ?? []).find(
    (t) => cargoExamBaseIds.has(t.examBaseId) && t.currentStage !== 'FINAL',
  )

  // Aba ativa: Detalhes é a porta de entrada (a ficha morfa vinda do concurso);
  // Treino é a aba de ação.
  const [tab, setTab] = useState<'treino' | 'detalhes'>('detalhes')

  const bancaName = concurso.examBoard?.alias ?? concurso.examBoard?.name ?? null
  const examDate = cargo.examDate
  const cut = toPercent(cargo.minPassingGrade)

  const fichaHero: FichaFact = {
    icon: BanknotesIcon,
    label: 'Salário base',
    value: cargo.salaryBase != null ? formatBRL(cargo.salaryBase) : null,
  }
  const ficha: Array<FichaFact> = [
    { icon: ClockIcon, label: 'Jornada', value: cargo.workload },
    {
      icon: UsersIcon,
      label: 'Vagas',
      value:
        cargo.vacancyCount != null
          ? `${cargo.vacancyCount}${cargo.hasReserveList ? ' + cadastro reserva' : ''}`
          : cargo.hasReserveList
            ? 'Cadastro de reserva'
            : null,
    },
    { icon: AcademicCapIcon, label: 'Requisitos', value: cargo.requirements },
    {
      icon: TicketIcon,
      label: 'Taxa de inscrição',
      value: cargo.registrationFee != null ? formatBRL(cargo.registrationFee) : null,
    },
    {
      icon: FlagIcon,
      label: 'Nota mínima para aprovação',
      value: cut != null ? `${cut}%` : null,
    },
  ]

  return (
    <>
      {/* ░░ Cabeçalho do cargo (mesmo shell do concurso: marca + título + chip) ░░ */}
      <header {...enter(0)} className="flex min-w-0 items-center gap-4">
        <InstitutionMark
          institution={concurso.institution}
          style={{ viewTransitionName: 'institution-mark' }}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1
            style={{ viewTransitionName: 'cargo-heading' }}
            className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            {cargo.role}
          </h1>
          <StatusPill
            status={concurso.status}
            label={statusLabel(concurso.status, examDate)}
          />
        </div>
      </header>

      {/* ░░ Abas: Treino (porta de entrada) · Detalhes (ficha) ░░ */}
      <CargoTabs
        tab={tab}
        onChange={setTab}
        hasActiveTraining={activeTraining != null}
      />

      {tab === 'treino' ? (
        <TreinoTab
          data={data}
          sessionByExamBase={latestTrainingByExamBase}
          cut={cut}
          meters={meters}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {/* ░░ Coluna principal ░░ */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section {...enter(1)} className={`${CARD} p-5 sm:p-6`}>
              <h2 className="text-base font-bold text-slate-900">Sobre a vaga</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                O que o edital diz sobre o trabalho deste cargo
              </p>
              {cargo.description != null && cargo.description.trim() !== '' ? (
                <p className="mt-3 max-w-prose whitespace-pre-line text-sm leading-6 text-slate-600">
                  {cargo.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  A descrição das atribuições desta vaga ainda não foi cadastrada
                  no edital.
                </p>
              )}
            </section>

            {concurso.status !== 'past' && syllabusGroups.length > 0 && (
              <SyllabusSection groups={syllabusGroups} enterIdx={2} />
            )}

            <SubjectBlock
              query={subjectQuery}
              status={concurso.status}
              bancaName={bancaName}
              examDate={examDate}
              meters={meters}
              enterIdx={3}
            />

            <CompetitionSection query={competitionQuery} enterIdx={4} />
          </div>

          {/* ░░ Sidebar — ficha do cargo + provas anteriores ░░ */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
            <FichaCard
              title="Ficha do cargo"
              hero={fichaHero}
              rows={ficha}
              editalUrl={cargo.editalUrl}
              enterIdx={2}
              viewTransitionName="ficha-card"
            />

            {previousExams.length > 0 && concurso.examBoard != null && (
              <PreviousExamsCard
                exams={previousExams}
                examBoardId={concurso.examBoard.id}
                enterIdx={3}
              />
            )}
          </aside>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Abas Treino / Detalhes                                             */
/* ------------------------------------------------------------------ */

function CargoTabs(props: {
  tab: 'treino' | 'detalhes'
  onChange: (t: 'treino' | 'detalhes') => void
  hasActiveTraining: boolean
}) {
  const { tab, onChange, hasActiveTraining } = props
  const base =
    'relative inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500'
  const tabClass = (active: boolean) =>
    `${base} ${active ? 'text-cyan-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`
  return (
    <div
      role="tablist"
      aria-label="Seções do cargo"
      className="-mb-px flex gap-1 border-b border-slate-200"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'detalhes'}
        onClick={() => onChange('detalhes')}
        className={tabClass(tab === 'detalhes')}
      >
        Detalhes
        {tab === 'detalhes' && (
          <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-cyan-600" />
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'treino'}
        onClick={() => onChange('treino')}
        className={tabClass(tab === 'treino')}
      >
        <ViewfinderCircleIcon className="h-4 w-4" />
        Treino
        {hasActiveTraining && (
          <span
            className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${
              tab === 'treino'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            em andamento
          </span>
        )}
        {tab === 'treino' && (
          <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-cyan-600" />
        )}
      </button>
    </div>
  )
}

/* ================================================================== */
/*  Aba TREINO — cronograma guiado                                     */
/* ================================================================== */

/** Ano (UTC) de uma data ISO date-only; null se inválida. */
function yearOf(iso: string | null): string {
  if (iso == null) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : String(d.getUTCFullYear())
}

/**
 * Aba Treino como um quadro de provas: a prova oficial do concurso é a âncora
 * fixa; ao clicar em "Treinar" numa prova, a aba troca para a experiência de
 * treino daquela prova — sem sair do concurso (breadcrumb/contexto preservados).
 */
function TreinoTab(props: {
  data: CargoDetail
  sessionByExamBase: Map<string, TrainingListItem>
  cut: number | null
  meters: boolean
}) {
  const { data, sessionByExamBase, cut, meters } = props
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const bancaLabel =
    data.concurso.examBoard?.alias ?? data.concurso.examBoard?.name ?? 'Banca'
  const boardId = data.concurso.examBoard?.id ?? null

  // Prova oficial = a primária do cargo (mesmo futura, sem questões próprias).
  const primary =
    data.provas.length > 0
      ? (data.provas.find((p) => p.isPrimary) ?? data.provas[0])
      : null
  const official: ProvaTrainOption | null = primary
    ? {
        examBaseId: primary.examBaseId,
        examBoardId: boardId,
        studyPlan: primary.studyPlan,
        questionCount: primary.questionCount,
        kind: 'official',
        title: data.cargo.role,
        subtitle: `${data.cargo.role} · ${bancaLabel} · ${data.concurso.institution} ${data.concurso.year}`,
        logoTop: bancaLabel,
        logoBottom: yearOf(primary.examDate),
      }
    : null

  // Recomendadas = outras provas próprias com questões + provas relacionadas.
  const ownExtra: Array<ProvaTrainOption> = data.provas
    .filter((p) => !p.isPrimary && p.questionCount > 0)
    .map((p) => ({
      examBaseId: p.examBaseId,
      examBoardId: boardId,
      studyPlan: p.studyPlan,
      questionCount: p.questionCount,
      kind: 'own',
      title: p.label ?? 'Outra prova',
      subtitle: `${data.concurso.institution} ${data.concurso.year}`,
      logoTop: bancaLabel,
      logoBottom: yearOf(p.examDate),
    }))
  const related: Array<ProvaTrainOption> = data.relatedProvas.map((r) => ({
    examBaseId: r.examBaseId,
    examBoardId: r.examBoardId,
    studyPlan: r.studyPlan,
    questionCount: r.questionCount,
    kind: 'related',
    title: `${r.examBoardAlias ?? 'Banca'} · ${r.year}`,
    subtitle: r.institution,
    logoTop: r.examBoardAlias ?? 'Banca',
    logoBottom: String(r.year),
  }))
  const recommended = [...ownExtra, ...related]

  const allOptions = official != null ? [official, ...recommended] : recommended
  const selected = allOptions.find((o) => o.examBaseId === selectedId) ?? null

  // Sem prova oficial treinável e sem recomendadas → empty state.
  const officialTrainable = official != null && official.questionCount > 0
  if (!officialTrainable && recommended.length === 0) {
    return (
      <section className={`${CARD} p-6 sm:p-8 text-center`}>
        <h2 className="text-base font-bold text-slate-900">
          Ainda não há provas para treinar este cargo
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Enquanto cadastramos as questões, você pode treinar com simulados gerais
          de enfermagem.
        </p>
        <Link
          to="/treino"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-cyan-700"
        >
          <PlayIcon className="h-4 w-4" />
          Ir para o treino
        </Link>
      </section>
    )
  }

  if (selected != null) {
    return (
      <TrainingView
        option={selected}
        session={sessionByExamBase.get(selected.examBaseId) ?? null}
        cut={cut}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <ProvasBoard
      official={official}
      recommended={recommended}
      sessionByExamBase={sessionByExamBase}
      cut={cut}
      meters={meters}
      onTrain={setSelectedId}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Vista de TREINO (uma prova selecionada, dentro do concurso)        */
/* ------------------------------------------------------------------ */

function TrainingView(props: {
  option: ProvaTrainOption
  session: TrainingListItem | null
  cut: number | null
  onBack: () => void
}) {
  const { option, session, cut, onBack } = props
  const score =
    option.studyPlan.bestScore != null ? Math.round(option.studyPlan.bestScore) : null
  const passing = score != null && cut != null && score >= cut

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de contexto: lembra que o treino é dentro do concurso. */}
      <div
        {...enter(0)}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 px-4 shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-cyan-50 leading-none text-cyan-700">
            <span className="text-[0.66rem] font-extrabold">{option.logoTop}</span>
            <span className="text-[0.56rem] font-bold opacity-80">{option.logoBottom}</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">
              Treinando: {option.kind === 'official' ? 'Prova oficial' : option.title}
            </p>
            <p className="truncate text-xs text-slate-500">
              {option.kind === 'official'
                ? 'Prova oficial do concurso'
                : option.kind === 'related'
                  ? 'Prova relacionada'
                  : 'Prova equivalente'}{' '}
              · dentro deste concurso
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {score != null && (
            <div className="hidden text-right sm:block">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">
                Prontidão
              </p>
              <p className="text-sm font-bold text-slate-700">
                <span className={passing ? 'text-emerald-600' : 'text-slate-900'}>{score}%</span>
                {cut != null && !passing && (
                  <span className="text-slate-500"> · faltam {cut - score} pts</span>
                )}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Voltar às provas
          </button>
        </div>
      </div>

      <TrainingFlow examBaseId={option.examBaseId} session={session} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Conteúdo programático (só prova aberta/futura, some se vazio)      */
/* ------------------------------------------------------------------ */

function SyllabusSection(props: {
  groups: CargoDetail['syllabusGroups']
  enterIdx: number
}) {
  const groups = [...props.groups].sort((a, b) => a.order - b.order)
  const e = enter(props.enterIdx)
  return (
    <section
      aria-labelledby="programatico-heading"
      style={e.style}
      className={`${e.className} ${CARD} p-5 sm:p-6`}
    >
      <h2 id="programatico-heading" className="text-base font-bold text-slate-900">
        Conteúdo programático
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        O que pode ser cobrado, conforme o edital
      </p>
      <div className="mt-3 flex flex-col divide-y divide-slate-100">
        {groups.map((g) => (
          <details key={g.name} className="group py-1">
            <summary className="-mx-2 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 [&::-webkit-details-marker]:hidden">
              {g.name}
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
            </summary>
            <p className="max-w-prose pb-2.5 pl-2 text-sm leading-6 text-slate-600">
              {g.topics}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Bloco de matérias temporal                                         */
/* ------------------------------------------------------------------ */

function SubjectBlock(props: {
  query: ReturnType<typeof useSubjectDistributionQuery>
  status: ConcursoStatus
  bancaName: string | null
  examDate: string | null
  meters: boolean
  enterIdx: number
}) {
  const { query, status, bancaName, meters, enterIdx } = props

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label="Carregando distribuição de matérias"
        className={`h-64 animate-pulse rounded-2xl bg-slate-200/70 ${enter(enterIdx).className}`}
        style={enter(enterIdx).style}
      />
    )
  }
  // Falha aqui não derruba a página: o bloco simplesmente não aparece.
  if (query.error != null) return null

  const data = query.data
  if (data.subjects.length === 0) {
    const e = enter(enterIdx)
    return (
      <section style={e.style} className={`${e.className} ${CARD} p-5 sm:p-6`}>
        <h2 className="text-base font-bold text-slate-900">
          {status === 'past' ? 'O que caiu na prova' : 'O que costuma cair'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {status === 'past'
            ? 'Ainda não cadastramos as questões desta prova.'
            : data.sourceExams.length > 0
              ? 'Ainda não cadastramos as questões das provas anteriores deste cargo. Assim que estiverem no ar, a distribuição de matérias aparece aqui.'
              : 'Sem provas anteriores desta banca para estimar o que pode cair. Assim que houver, a distribuição de matérias aparece aqui.'}
        </p>
      </section>
    )
  }

  if (status === 'past') {
    const applied = fmtDate(props.examDate)
    return (
      <SubjectDistribution
        title="O que caiu na prova"
        subtitle={`Composição das ${data.totalQuestions} questões aplicadas${applied != null ? ` em ${applied}` : ''}`}
        data={data}
        meters={meters}
        enterIdx={enterIdx}
        predictive={false}
      />
    )
  }

  const years = listYears(data.sourceExams.map((s) => s.year))
  return (
    <SubjectDistribution
      title={`O que ${bancaName ?? 'a banca'} costuma cobrar`}
      subtitle={
        years !== ''
          ? `Padrão ${data.sourceExams.length === 1 ? 'da prova' : 'das provas'} de ${years} deste cargo — estimativa, não garantia`
          : 'Padrão histórico deste cargo — estimativa, não garantia'
      }
      data={data}
      meters={meters}
      enterIdx={enterIdx}
      predictive
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Concorrência histórica (some se não houver edições)                */
/* ------------------------------------------------------------------ */

function CompetitionSection(props: {
  query: ReturnType<typeof useCompetitionHistoryQuery>
  enterIdx: number
}) {
  const { query, enterIdx } = props

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label="Carregando concorrência histórica"
        className={`h-40 animate-pulse rounded-2xl bg-slate-200/70 ${enter(enterIdx).className}`}
        style={enter(enterIdx).style}
      />
    )
  }
  if (query.error != null || query.data.editions.length === 0) {
    return null
  }

  const editions = query.data.editions
  /* Enquanto não houver corte real cadastrado, a coluna mostra a nota
   * mínima do edital — e é rotulada como tal para não mentir. */
  const hasRealCut = editions.some((ed) => ed.actualCutScore != null)
  const gradeOf = (ed: CompetitionHistory['editions'][number]) =>
    toPercent(hasRealCut ? ed.actualCutScore : ed.minPassingGrade)

  const e = enter(enterIdx)
  return (
    <section
      aria-labelledby="concorrencia-heading"
      style={e.style}
      className={`${e.className} ${CARD} p-5 sm:p-6`}
    >
      <div className="flex items-center gap-2">
        <ChartBarIcon className="h-4 w-4 text-slate-400" />
        <h2 id="concorrencia-heading" className="text-base font-bold text-slate-900">
          Concorrência histórica
        </h2>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Edições anteriores deste cargo na mesma instituição
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400">
              <th scope="col" className="pb-2 font-semibold">
                Ano
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Inscritos
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Concorrência
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                {hasRealCut ? 'Nota de corte' : 'Nota mínima'}
              </th>
            </tr>
          </thead>
          <tbody>
            {editions.map((ed) => {
              const grade = gradeOf(ed)
              return (
                <tr
                  key={ed.examBaseId}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  <td className="py-2.5 font-semibold text-slate-800">{ed.year}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {ed.applicantCount != null ? integer.format(ed.applicantCount) : '—'}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {ed.perVacancy != null ? `${ed.perVacancy} / vaga` : '—'}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">
                    {grade != null ? `${grade}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Provas anteriores (sidebar)                                        */
/* ------------------------------------------------------------------ */

function PreviousExamsCard(props: {
  exams: Array<CargoPreviousExam>
  examBoardId: string
  enterIdx: number
}) {
  const exams = [...props.exams].sort((a, b) => b.year - a.year)
  const e = enter(props.enterIdx)
  return (
    <section
      aria-labelledby="provas-anteriores-heading"
      style={e.style}
      className={`${e.className} ${CARD} p-5`}
    >
      <h2 id="provas-anteriores-heading" className="text-sm font-bold text-slate-900">
        Provas anteriores
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Treine com as provas reais deste cargo.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {exams.map((exam) => (
          <Link
            key={exam.examBaseId}
            to="/exams/$examBoard/$examId"
            params={{ examBoard: props.examBoardId, examId: exam.examBaseId }}
            className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 no-underline transition-all hover:border-cyan-300 hover:bg-cyan-50/40 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-cyan-600" />
              <span className="truncate">
                Prova {exam.year}
                {exam.questionCount > 0 && (
                  <span className="font-normal text-slate-400">
                    {' '}· {exam.questionCount}{' '}
                    {exam.questionCount === 1 ? 'questão' : 'questões'}
                  </span>
                )}
              </span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-600" />
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Estados: skeleton, erro/404                                        */
/* ------------------------------------------------------------------ */

/** Silhueta do layout (header + plano + matérias + sidebar) enquanto carrega. */
function CargoSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-slate-200/70'
  return (
    <div role="status" aria-label="Carregando cargo" className="contents">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className={`h-6 w-44 rounded-full ${block}`} />
          <div className={`h-8 w-72 max-w-full ${block}`} />
          <div className={`h-4 w-56 max-w-full ${block}`} />
        </div>
        <div className={`h-10 w-44 ${block}`} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className={`h-72 ${block}`} />
          <div className={`h-64 ${block}`} />
        </div>
        <div className="flex flex-col gap-4">
          <div className={`h-80 ${block}`} />
          <div className={`h-40 ${block}`} />
        </div>
      </div>
      <span className="sr-only">Carregando cargo…</span>
    </div>
  )
}

/** 404 (cargo inexistente/irrelevante) ou falha de rede, com volta pro concurso. */
function CargoErrorState(props: {
  error: unknown
  concursoSlug: string
  onRetry: () => void
}) {
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
          {notFound ? 'Cargo não encontrado' : 'Não foi possível carregar o cargo'}
        </h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          {notFound
            ? 'O cargo que você procura não existe neste concurso ou não é da área de enfermagem.'
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
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: props.concursoSlug }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
            notFound
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
          }`}
        >
          Voltar ao concurso
        </Link>
      </div>
    </section>
  )
}
