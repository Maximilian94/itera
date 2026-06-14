import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckIcon,
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
import {
  useCargoQuery,
  useCompetitionHistoryQuery,
  useSubjectDistributionQuery,
} from '@/features/concurso/queries/concurso.queries'
import {
  useCreateTrainingMutation,
  useTrainingsQuery,
} from '@/features/training/queries/training.queries'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import {
  TRAINING_STAGE_ORDER,
  TREINO_STAGES,
  getStagePath,
} from '@/routes/_authenticated/treino/-stages.config'
import { useRequireAccess } from '@/features/stripe/hooks/useRequireAccess'
import { CARD } from '@/features/concurso/components/card'
import { METER_BAR, enter, useMeters } from '@/features/concurso/components/motion'
import { StatusPill } from '@/features/concurso/components/StatusPill'
import { FichaCard } from '@/features/concurso/components/FichaCard'
import { SubjectDistribution } from '@/features/concurso/components/SubjectDistribution'
import { ReadinessBar } from '@/features/concurso/components/ReadinessBar'
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
function buildTrainingOptions(data: CargoDetail): TrainingOption[] {
  const boardId = data.concurso.examBoard?.id ?? null
  const own: TrainingOption[] = data.provas
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
  const related: TrainingOption[] = data.relatedProvas.map((r) => ({
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

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Breadcrumb
        concursoSlug={concursoSlug}
        concursoLabel={
          data != null ? `${data.concurso.institution} · ${data.concurso.year}` : null
        }
        cargoLabel={data?.cargo.role ?? null}
      />
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

function Breadcrumb(props: {
  concursoSlug: string
  concursoLabel: string | null
  cargoLabel: string | null
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        <li>
          <Link
            to="/concursos"
            className="font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
          >
            Concursos
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
          {props.concursoLabel != null ? (
            <Link
              to="/concursos/$concursoSlug"
              params={{ concursoSlug: props.concursoSlug }}
              className="truncate font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
            >
              {props.concursoLabel}
            </Link>
          ) : (
            <span aria-hidden className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          )}
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
          {props.cargoLabel != null ? (
            <span className="truncate font-semibold text-slate-900">
              {props.cargoLabel}
            </span>
          ) : (
            <span aria-hidden className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          )}
        </li>
      </ol>
    </nav>
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

  // Treino em andamento (não concluído) de alguma prova deste cargo, mais recente
  // primeiro (lista vem updatedAt desc).
  const optionExamBaseIds = new Set(trainingOptions.map((o) => o.examBaseId))
  const activeTraining = (trainingsQuery.data ?? []).find(
    (t) => optionExamBaseIds.has(t.examBaseId) && t.currentStage !== 'FINAL',
  )

  // Prova "em foco" no cronograma: a do treino ativo; senão a 1ª opção
  // recomendada. Conduz o próximo passo + a timeline do plano.
  const featuredOption =
    (activeTraining != null
      ? trainingOptions.find((o) => o.examBaseId === activeTraining.examBaseId)
      : undefined) ?? trainingOptions[0] ?? null
  const featuredSession = featuredOption
    ? (latestTrainingByExamBase.get(featuredOption.examBaseId) ?? null)
    : null

  // Aba ativa: Treino é a porta de entrada (ação principal); Detalhes é a ficha.
  const [tab, setTab] = useState<'treino' | 'detalhes'>('treino')

  const bancaName = concurso.examBoard?.alias ?? concurso.examBoard?.name ?? null
  const examDate = cargo.examDate
  const cut = toPercent(cargo.minPassingGrade)

  const contextLine = [
    `Concurso ${concurso.institution} ${concurso.year}`,
    bancaName,
    fmtDate(examDate) != null ? `prova ${fmtDate(examDate)}` : null,
  ]
    .filter((p): p is string => p != null)
    .join(' · ')

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
      {/* ░░ Cabeçalho do cargo ░░ */}
      <header {...enter(0)}>
        <div className="min-w-0 max-w-prose">
          <StatusPill
            status={concurso.status}
            label={statusLabel(concurso.status, examDate)}
          />
          <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {cargo.role}
          </h1>
          {contextLine !== '' && (
            <p className="mt-1 text-sm text-slate-500">{contextLine}</p>
          )}
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
          options={trainingOptions}
          featuredOption={featuredOption}
          featuredSession={featuredSession}
          sessionByExamBase={latestTrainingByExamBase}
          subjectQuery={subjectQuery}
          status={concurso.status}
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
    </div>
  )
}

/* ================================================================== */
/*  Aba TREINO — cronograma guiado                                     */
/* ================================================================== */

type WeakSubject = { subject: string; accuracyPct: number }

/** Ações compartilhadas de um programa: começar (cria) ou continuar (retoma). */
function useProgramActions(
  examBaseId: string,
  session: TrainingListItem | null,
) {
  const navigate = useNavigate()
  const { requireAccess } = useRequireAccess()
  const createTraining = useCreateTrainingMutation()
  const isFinished = session?.currentStage === 'FINAL'
  const inProgress = session != null && !isFinished

  const start = () => {
    if (!requireAccess()) return
    createTraining.mutate(
      { examBaseId, immediateFeedback: true },
      { onSuccess: (res) => void navigate({ to: getStagePath('prova', res.trainingId) }) },
    )
  }
  const resume = () => {
    if (session == null) return
    const slug =
      TREINO_STAGES[TRAINING_STAGE_ORDER.indexOf(session.currentStage)]?.slug ?? 'prova'
    void navigate({ to: getStagePath(slug, session.trainingId) })
  }
  return {
    isFinished,
    inProgress,
    start,
    resume,
    isStarting: createTraining.isPending,
    isError: createTraining.isError,
  }
}

/** Orquestra a aba: prontidão + próximo passo + plano + matérias + outras provas. */
function TreinoTab(props: {
  options: TrainingOption[]
  featuredOption: TrainingOption | null
  featuredSession: TrainingListItem | null
  sessionByExamBase: Map<string, TrainingListItem>
  subjectQuery: ReturnType<typeof useSubjectDistributionQuery>
  status: ConcursoStatus
  cut: number | null
  meters: boolean
}) {
  const { featuredOption, featuredSession, subjectQuery, cut, meters } = props

  if (featuredOption == null) {
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

  // Prontidão e ponto fraco refletem a prova em foco (a do treino/recomendada).
  const plan = featuredOption.studyPlan

  // Matéria mais fraca ponderada pelo peso na prova → guia o próximo passo.
  const w = subjectQuery.data?.insight.weakestRelevant ?? null
  const weakest: WeakSubject | null = w
    ? { subject: w.subject, accuracyPct: Math.round(w.accuracy * 100) }
    : plan.weakSubjects[0]
      ? {
          subject: plan.weakSubjects[0].subject,
          accuracyPct: plan.weakSubjects[0].accuracy,
        }
      : null

  const others = props.options.filter((o) => o.examBaseId !== featuredOption.examBaseId)

  return (
    <div className="flex flex-col gap-4">
      <ReadinessStrip studyPlan={plan} cut={cut} meters={meters} />

      {(featuredOption.kind === 'related' || others.length > 0) && (
        <p className="-mt-1 px-1 text-xs text-slate-500">
          Plano com base na prova{' '}
          <span className="font-semibold text-slate-700">{featuredOption.label}</span>
          {featuredOption.kind === 'related' ? ' (relacionada)' : ''}.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <NextStepCard
            option={featuredOption}
            session={featuredSession}
            weakest={weakest}
          />
          <PlanTimeline session={featuredSession} />
          <SubjectMastery query={subjectQuery} meters={meters} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <OtherProvasList
            options={others}
            sessionByExamBase={props.sessionByExamBase}
            status={props.status}
          />
        </aside>
      </div>
    </div>
  )
}

/** Barra de prontidão: melhor nota contra o corte (momentum honesto). */
function ReadinessStrip(props: { studyPlan: StudyPlan; cut: number | null; meters: boolean }) {
  const { studyPlan, cut, meters } = props
  const score = studyPlan.bestScore != null ? Math.round(studyPlan.bestScore) : null
  const delta = studyPlan.scoreDelta != null ? Math.round(studyPlan.scoreDelta) : null
  const passing = score != null && cut != null && score >= cut

  return (
    <section {...enter(0)} className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="min-w-[12rem]">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">
            Prontidão para aprovar
          </p>
          {score != null ? (
            <>
              <div className="mt-1.5 flex items-end gap-2.5">
                <span
                  className={`text-3xl font-extrabold leading-none tracking-tight ${
                    cut == null ? 'text-slate-900' : passing ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {score}%
                </span>
                {delta != null && delta !== 0 && (
                  <span
                    className={`mb-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {delta > 0 ? (
                      <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                    )}
                    {delta > 0 ? '+' : ''}
                    {delta} pt
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {cut == null
                  ? 'sua melhor nota'
                  : passing
                    ? 'Acima da nota de corte. Mantenha o ritmo.'
                    : `Faltam ${cut - score} pts para o corte de ${cut}%.`}
              </p>
            </>
          ) : (
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              Faça a prova diagnóstica para medir onde você está e quanto falta
              para o corte{cut != null ? ` de ${cut}%` : ''}.
            </p>
          )}
        </div>
        {score != null && (
          <div className="min-w-[14rem] flex-1">
            <ReadinessBar value={score} cut={cut} meters={meters} size="md" className="w-full" />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>0%</span>
              {cut != null && <span className="font-semibold text-slate-600">corte {cut}%</span>}
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/** Próximo passo: UMA ação em destaque, derivada do estágio do treino em foco. */
function NextStepCard(props: {
  option: TrainingOption
  session: TrainingListItem | null
  weakest: WeakSubject | null
}) {
  const { option, session, weakest } = props
  const navigate = useNavigate()
  const { inProgress, isFinished, start, resume, isStarting, isError } = useProgramActions(
    option.examBaseId,
    session,
  )

  // Define título/legenda/CTA conforme o estágio atual do ciclo.
  let title: string
  let subtitle: string
  let ctaLabel: string
  const onCta = inProgress ? resume : start

  if (inProgress && session != null) {
    switch (session.currentStage) {
      case 'EXAM':
        title = 'Continuar a prova diagnóstica'
        subtitle = 'Termine de responder para receber seu diagnóstico.'
        ctaLabel = 'Continuar prova'
        break
      case 'DIAGNOSIS':
        title = 'Ver seu diagnóstico'
        subtitle = 'Descubra onde você está forte e onde precisa focar.'
        ctaLabel = 'Ver diagnóstico'
        break
      case 'STUDY':
        title = weakest != null ? `Estudar: ${weakest.subject}` : 'Continuar estudando'
        subtitle =
          weakest != null
            ? `Sua matéria mais fraca entre as que mais caem (${weakest.accuracyPct}% de acerto).`
            : 'Avance nas matérias que mais derrubam sua nota.'
        ctaLabel = 'Continuar estudando'
        break
      case 'RETRY':
        title = 'Refazer o que você errou'
        subtitle = 'Segunda chance nas questões erradas, sem ver o que marcou antes.'
        ctaLabel = 'Refazer questões'
        break
      default:
        title = 'Continuar treino'
        subtitle = 'Retome de onde você parou.'
        ctaLabel = 'Continuar'
    }
  } else if (isFinished) {
    title = 'Comece um novo ciclo'
    subtitle = 'Você concluiu um ciclo. Faça outro para medir um novo ganho.'
    ctaLabel = 'Começar novo ciclo'
  } else {
    title = 'Fazer a prova diagnóstica'
    subtitle = 'Comece pelo diagnóstico — o plano se ajusta ao seu desempenho real.'
    ctaLabel = 'Começar treino'
  }

  return (
    <section
      {...enter(1)}
      className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm sm:p-6"
    >
      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-cyan-700">
        Seu próximo passo
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600 shadow-sm">
          <AcademicCapIcon className="h-6 w-6 text-white" />
        </span>
        <div className="min-w-[12rem] flex-1">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-cyan-800">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onCta}
          disabled={isStarting}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          <PlayIcon className="h-4 w-4" />
          {isStarting ? 'Iniciando…' : ctaLabel}
        </button>
      </div>
      {isFinished && session != null && (
        <button
          type="button"
          onClick={() => void navigate({ to: getStagePath('final', session.trainingId) })}
          className="mt-3 cursor-pointer text-sm font-semibold text-cyan-700 hover:text-cyan-800"
        >
          Ver resultado
        </button>
      )}
      {isError && (
        <p className="mt-3 text-sm text-rose-600">
          Não foi possível começar o treino agora. Verifique seu plano ou tente novamente.
        </p>
      )}
    </section>
  )
}

/** Timeline read-only dos 5 estágios do ciclo de treino em foco. */
function PlanTimeline(props: { session: TrainingListItem | null }) {
  const { session } = props
  const stageIdx = session != null ? TRAINING_STAGE_ORDER.indexOf(session.currentStage) : -1
  const isFinished = session?.currentStage === 'FINAL'
  const doneCount = isFinished ? TREINO_STAGES.length : Math.max(0, stageIdx)

  return (
    <section {...enter(2)} className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Seu plano de treino</h2>
        <span className="text-xs font-semibold text-cyan-700">
          {doneCount} de {TREINO_STAGES.length} etapas
        </span>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Um ciclo: faça a prova, receba o diagnóstico, estude os pontos fracos,
        refaça o que errou e meça a evolução.
      </p>
      <ol className="mt-5 flex flex-col">
        {TREINO_STAGES.map((stage, i) => {
          const state: 'done' | 'current' | 'upcoming' =
            stageIdx < 0
              ? 'upcoming'
              : isFinished || i < stageIdx
                ? 'done'
                : i === stageIdx
                  ? 'current'
                  : 'upcoming'
          return (
            <li key={stage.slug} className="relative flex gap-4 pb-5 last:pb-0">
              {i < TREINO_STAGES.length - 1 && (
                <span className="absolute left-3 top-7 h-full w-px bg-slate-200" />
              )}
              {state === 'done' ? (
                <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : state === 'current' ? (
                <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white ring-4 ring-cyan-100">
                  {i + 1}
                </span>
              ) : (
                <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
              )}
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-bold ${
                      state === 'upcoming'
                        ? 'text-slate-400'
                        : state === 'current'
                          ? 'text-cyan-700'
                          : 'text-slate-900'
                    }`}
                  >
                    {stage.title}
                  </p>
                  {state === 'current' && (
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[0.62rem] font-bold text-cyan-700">
                      Você está aqui
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-sm leading-6 ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {stage.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const MASTERY = {
  strong: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', label: 'Sólido' },
  mid: { dot: 'bg-amber-500', bar: 'bg-amber-500', label: 'Em construção' },
  risk: { dot: 'bg-rose-500', bar: 'bg-rose-500', label: 'Precisa de atenção' },
} as const
type MasteryLevel = keyof typeof MASTERY

function masteryLevel(acc: number): MasteryLevel {
  if (acc >= 0.7) return 'strong'
  if (acc >= 0.5) return 'mid'
  return 'risk'
}

/** Domínio por matéria: farol de acerto por matéria, ponderado pelo peso. */
function SubjectMastery(props: {
  query: ReturnType<typeof useSubjectDistributionQuery>
  meters: boolean
}) {
  const { query, meters } = props

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label="Carregando domínio por matéria"
        className={`h-72 animate-pulse rounded-2xl bg-slate-200/70 ${enter(3).className}`}
        style={enter(3).style}
      />
    )
  }
  if (query.error != null || query.data.subjects.length === 0) return null

  const total = query.data.totalQuestions || 1
  // Prioriza matéria fraca e que pesa muito (share × (1−acerto)); sem dado de
  // acerto vai para o fim, ordenada por peso.
  const rows = [...query.data.subjects].sort((a, b) => {
    const pa = a.userAccuracy != null ? a.share * (1 - a.userAccuracy) : -1
    const pb = b.userAccuracy != null ? b.share * (1 - b.userAccuracy) : -1
    if (pa !== pb) return pb - pa
    return b.share - a.share
  })

  return (
    <section {...enter(3)} className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Domínio por matéria</h2>
        <span className="text-xs text-slate-500">o que cai nesta prova</span>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">
        Seu acerto por matéria. Priorize as vermelhas que mais pesam na prova.
      </p>
      <div className="mt-4">
        {rows.map((s) => {
          const weight = Math.round((s.count / total) * 100)
          const acc = s.userAccuracy
          const pct = acc != null ? Math.round(acc * 100) : null
          const level = acc != null ? masteryLevel(acc) : null
          return (
            <div key={s.subject} className="border-t border-slate-100 py-3.5 first:border-t-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${level != null ? MASTERY[level].dot : 'bg-slate-300'}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
                  {s.subject}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{weight}% da prova</span>
                <span className="w-11 shrink-0 text-right text-sm font-extrabold tabular-nums text-slate-900">
                  {pct != null ? `${pct}%` : '—'}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`${METER_BAR} h-full ${level != null ? MASTERY[level].bar : 'bg-slate-300'}`}
                  style={{ width: meters && pct != null ? `${pct}%` : '0%' }}
                />
              </div>
              {level === 'risk' && (
                <p className="mt-1.5 text-xs font-semibold text-amber-700">
                  Precisa de atenção
                </p>
              )}
              {acc == null && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Responda mais questões para medir seu domínio
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />Precisa de atenção
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />Em construção
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />Sólido
        </span>
      </div>
    </section>
  )
}

/** Outras provas para treinar (própria(s) restante(s) + relacionadas). */
function OtherProvasList(props: {
  options: TrainingOption[]
  sessionByExamBase: Map<string, TrainingListItem>
  status: ConcursoStatus
}) {
  if (props.options.length === 0) return null
  return (
    <section {...enter(2)} className={`${CARD} p-5`}>
      <h2 className="text-sm font-bold text-slate-900">Treine com outras provas</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Cada prova tem seu próprio ciclo de treino e questões reais.
      </p>
      <div className="mt-3 flex flex-col">
        {props.options.map((opt) => (
          <OtherProvaRow
            key={opt.examBaseId}
            option={opt}
            session={props.sessionByExamBase.get(opt.examBaseId) ?? null}
          />
        ))}
      </div>
    </section>
  )
}

function OtherProvaRow(props: { option: TrainingOption; session: TrainingListItem | null }) {
  const { option, session } = props
  const { inProgress, isFinished, start, resume, isStarting } = useProgramActions(
    option.examBaseId,
    session,
  )
  const onClick = inProgress ? resume : start
  const stateLabel = inProgress ? 'Em andamento' : isFinished ? 'Concluído' : null

  return (
    <div className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <span className="truncate">{option.label}</span>
          {option.kind === 'related' && (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.62rem] font-semibold text-slate-500">
              relacionada
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {option.sublabel != null ? `${option.sublabel} · ` : ''}
          {option.questionCount} questões
          {stateLabel != null && (
            <span className="font-semibold text-cyan-700"> · {stateLabel}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={isStarting}
        aria-label={inProgress ? `Continuar treino: ${option.label}` : `Treinar: ${option.label}`}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-cyan-700 transition-colors hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-wait disabled:opacity-60"
      >
        <PlayIcon className="h-4 w-4" />
      </button>
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
