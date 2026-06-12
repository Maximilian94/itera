import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlayIcon,
  ScaleIcon,
  TicketIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { CARD, CARD_RAISE } from '../../../features/concurso/components/card'
import { enter, useMeters } from '../../../features/concurso/components/motion'
import { StatusPill } from '../../../features/concurso/components/StatusPill'
import { InstitutionMark } from '../../../features/concurso/components/InstitutionMark'
import {
  FichaCard,
  type FichaFact,
} from '../../../features/concurso/components/FichaCard'
import { SubjectDistribution } from '../../../features/concurso/components/SubjectDistribution'
import {
  VerticalTimeline,
  type TimelineStep,
} from '../../../features/concurso/components/VerticalTimeline'
import { ReadinessBar } from '../../../features/concurso/components/ReadinessBar'
import type { SubjectDistribution as SubjectDistributionData } from '../../../features/concurso/domain/concurso.types'

export const Route = createFileRoute('/_authenticated/concursos/preview')({
  component: ConcursoPreviewPage,
})

/* ------------------------------------------------------------------ */
/*  Mockup — two-level information architecture:                       */
/*  Nível 1: página do Concurso (resumo + escolha do cargo)            */
/*  Nível 2: página do Cargo (aprofundamento + preparação)             */
/*  Fake data + preview controls. Click a cargo to drill down.         */
/*  Only nursing-relevant cargos are shown — the platform filters      */
/*  out everything else upstream.                                      */
/*                                                                     */
/*  Os blocos compartilhados vivem em features/concurso/components     */
/*  (MAX-21) — este mockup os consome com dados fake.                  */
/* ------------------------------------------------------------------ */

type TemporalState = 'open' | 'future' | 'past'

type Cargo = {
  role: string
  vacancies: number
  vacancyNote?: string
  salary: string
  workload: string
  requirements: string
  questions: number
  bestScore: number
  cut: number
}

const CARGOS: Cargo[] = [
  {
    role: 'Enfermeiro',
    vacancies: 20,
    vacancyNote: '+ CR',
    salary: 'R$ 8.500',
    workload: '40h semanais',
    requirements: 'Superior em Enfermagem + registro COREN',
    questions: 120,
    bestScore: 72,
    cut: 60,
  },
  {
    role: 'Técnico de Enfermagem',
    vacancies: 50,
    vacancyNote: '+ CR',
    salary: 'R$ 4.800',
    workload: '40h semanais',
    requirements: 'Curso técnico + registro COREN',
    questions: 100,
    bestScore: 0,
    cut: 50,
  },
]

/** userScore: acerto do usuário na matéria (mock); coerente com o plano de estudos. */
const SUBJECTS: Array<{ name: string; count: number; userScore: number }> = [
  { name: 'Enfermagem (específicas)', count: 50, userScore: 74 },
  { name: 'Saúde Coletiva / SUS', count: 25, userScore: 48 },
  { name: 'Língua Portuguesa', count: 20, userScore: 70 },
  { name: 'Ética e Legislação (COFEN/COREN)', count: 15, userScore: 55 },
  { name: 'Raciocínio Lógico', count: 10, userScore: 66 },
]

const SUBJECT_TOTAL = SUBJECTS.reduce((sum, s) => sum + s.count, 0)

/** Monta o payload fake no formato da API de subject-distribution. */
function buildSubjectData(
  tState: TemporalState,
  score: number | null,
): SubjectDistributionData {
  return {
    mode: tState === 'past' ? 'actual' : 'historical',
    sourceExams: [],
    totalQuestions: SUBJECT_TOTAL,
    subjects: SUBJECTS.map((s) => ({
      subject: s.name,
      count: s.count,
      share: s.count / SUBJECT_TOTAL,
      userAccuracy: score != null ? s.userScore / 100 : null,
    })),
    insight: {
      topSubjects: [SUBJECTS[0].name, SUBJECTS[1].name],
      topShare: (SUBJECTS[0].count + SUBJECTS[1].count) / SUBJECT_TOTAL,
      weakestRelevant:
        score != null ? { subject: 'Saúde Coletiva / SUS', accuracy: 0.48 } : null,
    },
  }
}

/** Escopo oficial do edital — só faz sentido para provas que ainda vão
 *  acontecer; depois da prova, a distribuição real conta a história. */
const SYLLABUS: Array<{ group: string; topics: string }> = [
  {
    group: 'Conhecimentos específicos de Enfermagem',
    topics:
      'Sistematização da Assistência de Enfermagem (SAE); semiologia e semiotécnica; administração de medicamentos e cálculo de doses; biossegurança e controle de infecção; urgência e emergência; saúde da mulher, da criança e do idoso; central de material e esterilização.',
  },
  {
    group: 'Saúde Coletiva e SUS',
    topics:
      'Legislação do SUS (Lei 8.080/90 e 8.142/90); políticas nacionais de saúde; atenção primária e Estratégia Saúde da Família; vigilância epidemiológica; Programa Nacional de Imunizações.',
  },
  {
    group: 'Língua Portuguesa',
    topics: 'Compreensão e interpretação de textos; coesão e coerência; concordância; regência; pontuação.',
  },
  {
    group: 'Ética e Legislação profissional',
    topics: 'Código de Ética dos Profissionais de Enfermagem; Lei do Exercício Profissional (7.498/86); resoluções COFEN.',
  },
  {
    group: 'Raciocínio Lógico',
    topics: 'Estruturas lógicas; proposições; problemas aritméticos e matriciais.',
  },
]

const HISTORY: Array<{ year: string; applicants: string; perVacancy: string; cut: string }> = [
  { year: '2022', applicants: '1.786', perVacancy: '38 / vaga', cut: '64%' },
  { year: '2019', applicants: '1.214', perVacancy: '29 / vaga', cut: '61%' },
]

const STATUS_LABEL: Record<TemporalState, string> = {
  open: 'Inscrições abertas · encerram em 18 dias',
  future: 'Prova em 72 dias',
  past: 'Prova aplicada em 23/08/2022',
}

const YEAR: Record<TemporalState, string> = { open: '2026', future: '2026', past: '2022' }

const EDITAL_URL = 'https://example.com/edital-01.pdf'

/* ------------------------------------------------------------------ */
/*  Preview controls (dev-only chrome, not part of the design)         */
/* ------------------------------------------------------------------ */

function PreviewControls(props: {
  tState: TemporalState
  setTState: (s: TemporalState) => void
  hasAttempts: boolean
  setHasAttempts: (v: boolean) => void
}) {
  const seg = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
    }`
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Preview</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Estado</span>
        <div className="flex gap-0.5 rounded-lg bg-slate-200/70 p-0.5">
          {(
            [
              ['open', 'Inscrições abertas'],
              ['future', 'Prova futura'],
              ['past', 'Prova passada'],
            ] as Array<[TemporalState, string]>
          ).map(([s, label]) => (
            <button key={s} onClick={() => props.setTState(s)} className={seg(props.tState === s)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Tentativas</span>
        <div className="flex gap-0.5 rounded-lg bg-slate-200/70 p-0.5">
          <button onClick={() => props.setHasAttempts(true)} className={seg(props.hasAttempts)}>Com</button>
          <button onClick={() => props.setHasAttempts(false)} className={seg(!props.hasAttempts)}>Sem</button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function ConcursoPreviewPage() {
  const [tState, setTState] = useState<TemporalState>('past')
  const [hasAttempts, setHasAttempts] = useState(true)
  const [cargoIdx, setCargoIdx] = useState<number | null>(null)

  const openCargo = (i: number) => {
    setCargoIdx(i)
    window.scrollTo({ top: 0 })
  }
  const backToConcurso = () => {
    setCargoIdx(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-6">
      <PreviewControls
        tState={tState}
        setTState={setTState}
        hasAttempts={hasAttempts}
        setHasAttempts={setHasAttempts}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/exams" search={{ board: undefined }} className="font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700">
          Concursos
        </Link>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
        {cargoIdx == null ? (
          <span className="font-semibold text-slate-900">Prefeitura de Campinas · {YEAR[tState]}</span>
        ) : (
          <>
            <button onClick={backToConcurso} className="font-medium text-slate-500 transition-colors hover:text-cyan-700">
              Prefeitura de Campinas · {YEAR[tState]}
            </button>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="font-semibold text-slate-900">{CARGOS[cargoIdx].role}</span>
          </>
        )}
      </nav>

      {cargoIdx == null ? (
        <ConcursoLevel key={tState} tState={tState} hasAttempts={hasAttempts} onOpenCargo={openCargo} />
      ) : (
        <CargoLevel key={`${tState}-${cargoIdx}`} tState={tState} hasAttempts={hasAttempts} cargo={CARGOS[cargoIdx]} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Nível 1 — Página do Concurso (resumo + escolha do cargo)           */
/* ------------------------------------------------------------------ */

function ConcursoLevel(props: {
  tState: TemporalState
  hasAttempts: boolean
  onOpenCargo: (i: number) => void
}) {
  const { tState, hasAttempts, onOpenCargo } = props
  const year = YEAR[tState]
  const meters = useMeters()

  const fichaHero: FichaFact = { icon: CalendarDaysIcon, label: 'Prova objetiva', value: `23/08/${year}` }
  const ficha: FichaFact[] = [
    { icon: BuildingLibraryIcon, label: 'Banca', value: 'Cebraspe' },
    {
      icon: PencilSquareIcon,
      label: 'Inscrições',
      value: tState === 'open' ? '02/06 a 30/06' : tState === 'future' ? 'Encerradas' : '02/06 a 30/06/2022',
    },
    { icon: TicketIcon, label: 'Taxa de inscrição', value: 'R$ 90,00' },
    { icon: MapPinIcon, label: 'Cidade', value: 'Campinas / SP' },
    { icon: UsersIcon, label: 'Vagas de enfermagem', value: '70 + cadastro reserva' },
    { icon: ScaleIcon, label: 'Reserva de vagas', value: '20% negros · 5% PcD' },
  ]

  const timeline: TimelineStep[] = [
    { label: 'Edital publicado', date: `15/05/${year}`, state: 'done' },
    { label: 'Inscrições', date: '02/06 a 30/06', state: tState === 'open' ? 'current' : 'done' },
    {
      label: 'Prova objetiva',
      date: `23/08/${year}`,
      state: tState === 'future' ? 'current' : tState === 'past' ? 'done' : 'upcoming',
    },
    { label: 'Resultado final', date: `30/09/${year}`, state: tState === 'past' ? 'done' : 'upcoming' },
  ]

  return (
    <>
      {/* ░░ Cabeçalho do concurso ░░ */}
      <header {...enter(0)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <InstitutionMark institution="Prefeitura Municipal de Campinas" />
            <div className="min-w-0 max-w-prose">
              <StatusPill status={tState} label={STATUS_LABEL[tState]} />
              <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Concurso Prefeitura de Campinas {year}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Edital 01/{year} · Cebraspe · 70 vagas de enfermagem para a rede municipal de saúde
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
              <DocumentTextIcon className="h-4 w-4" />
              Edital
            </button>
            {tState === 'open' && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(8,145,178,0.4)] transition-all hover:bg-cyan-700 hover:shadow-[0_6px_16px_-2px_rgba(8,145,178,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                Inscrever-se
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* ░░ Coluna principal — escolha do cargo ░░ */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <section aria-labelledby="cargos-heading" className="flex flex-col gap-3">
            <div {...enter(1)}>
              <h2 id="cargos-heading" className="text-base font-bold text-slate-900">Escolha seu cargo</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Conteúdo, concorrência e nota de corte mudam por cargo. Entre no seu para ver os detalhes e treinar.
              </p>
            </div>

            {CARGOS.map((c, i) => {
              const score = hasAttempts && c.bestScore > 0 ? c.bestScore : null
              const passing = score != null && score >= c.cut
              return (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => onOpenCargo(i)}
                  {...{ style: enter(2 + i).style }}
                  className={`${enter(2 + i).className} ${CARD} ${CARD_RAISE} group p-5 text-left hover:border-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 sm:p-6`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-700">
                        {c.role}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {c.vacancies} vagas {c.vacancyNote} · {c.workload} · {c.questions} questões na prova
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">{c.salary}</p>
                        <p className="text-xs text-slate-500">salário base</p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all group-hover:bg-cyan-50 group-hover:text-cyan-600">
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3.5">
                    {score != null ? (
                      <div className="flex items-center gap-4">
                        <span className={`shrink-0 text-sm font-extrabold tabular-nums ${passing ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {score}%
                        </span>
                        <ReadinessBar value={score} cut={c.cut} meters={meters} size="sm" className="min-w-0 flex-1" />
                        <span className={`shrink-0 text-xs font-semibold ${passing ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {passing ? 'Acima do corte' : `${c.cut - score} pt para o corte`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">Você ainda não treinou para este cargo</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700">
                          <PlayIcon className="h-4 w-4" />
                          Começar
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </section>
        </div>

        {/* ░░ Sidebar — ficha do concurso + cronograma ░░ */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <FichaCard title="Ficha do concurso" hero={fichaHero} rows={ficha} editalUrl={EDITAL_URL} enterIdx={2} />

          <section {...{ style: enter(3).style }} className={`${enter(3).className} ${CARD} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Cronograma</h2>
              {tState === 'open' && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  <ClockIcon className="h-3.5 w-3.5" />18 dias
                </span>
              )}
            </div>
            <VerticalTimeline steps={timeline} />
          </section>
        </aside>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Nível 2 — Página do Cargo (aprofundamento + preparação)            */
/* ------------------------------------------------------------------ */

function CargoLevel(props: { tState: TemporalState; hasAttempts: boolean; cargo: Cargo }) {
  const { tState, hasAttempts, cargo } = props
  const year = YEAR[tState]
  const score = hasAttempts && cargo.bestScore > 0 ? cargo.bestScore : null
  const passing = score != null && score >= cargo.cut
  const subjectData = buildSubjectData(tState, score)
  const meters = useMeters()

  const ctaLabel =
    tState === 'open'
      ? 'Treinar com a prova de 2022'
      : score != null
        ? 'Continuar treino'
        : 'Fazer primeiro simulado'

  const fichaHero: FichaFact = { icon: BanknotesIcon, label: 'Salário base', value: cargo.salary }
  const ficha: FichaFact[] = [
    { icon: ClockIcon, label: 'Jornada', value: cargo.workload },
    { icon: UsersIcon, label: 'Vagas', value: `${cargo.vacancies} ${cargo.vacancyNote ?? ''}`.trim() },
    { icon: AcademicCapIcon, label: 'Requisitos', value: cargo.requirements },
    { icon: TicketIcon, label: 'Taxa de inscrição', value: 'R$ 90,00' },
    { icon: FlagIcon, label: 'Nota mínima para aprovação', value: `${cargo.cut}%` },
    { icon: ScaleIcon, label: 'Reserva de vagas', value: '20% negros · 5% PcD' },
  ]

  return (
    <>
      {/* ░░ Cabeçalho do cargo ░░ */}
      <header {...enter(0)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <StatusPill status={tState} label={STATUS_LABEL[tState]} />
            <h1 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {cargo.role}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Concurso Prefeitura de Campinas {year} · Cebraspe · prova 23/08/{year}
            </p>
          </div>
          <button className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(8,145,178,0.4)] transition-all hover:bg-cyan-700 hover:shadow-[0_6px_16px_-2px_rgba(8,145,178,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
          <PlayIcon className="h-5 w-5" />
          {ctaLabel}
        </button>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* ░░ Coluna principal ░░ */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Plano de estudos / preparação */}
          <section {...{ style: enter(1).style }} className={`${enter(1).className} ${CARD} p-5 sm:p-6`}>
            <h2 className="text-base font-bold text-slate-900">Seu plano de estudos</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {tState === 'past'
                ? `Prova de ${cargo.questions} questões da Cebraspe, corte em ${cargo.cut}%.`
                : `Enquanto a prova de ${year} não sai, treine com as provas anteriores da Cebraspe para este cargo.`}
            </p>

            {/* Prontidão (quando há tentativas) */}
            {score != null && (
              <div className="mt-4 grid gap-5 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/60 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
                <div>
                  <div className="flex items-end gap-3">
                    <span className={`text-4xl font-extrabold leading-none tracking-tight ${passing ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {score}%
                    </span>
                    <span className="mb-0.5 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <ArrowTrendingUpIcon className="h-3.5 w-3.5" />+8 pt
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">melhor nota · 6 simulados</p>
                </div>
                <div className="min-w-0">
                  <ReadinessBar value={score} cut={cargo.cut} meters={meters} size="md" className="w-full" />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${passing ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {passing ? 'Acima do corte' : `${cargo.cut - score} pt para o corte`}
                    </span>
                    <span className="text-slate-500">Corte {cargo.cut}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Etapas do plano — sequência real, por isso numerada */}
            <ol className="mt-5 flex flex-col">
              {(
                [
                  {
                    title: 'Diagnóstico',
                    desc: 'Faça um simulado completo para medir sua distância da nota de corte.',
                    cta: 'Fazer simulado',
                    state: score != null ? 'done' : 'current',
                  },
                  {
                    title: 'Treino dirigido',
                    desc:
                      score != null
                        ? 'Ataque suas matérias mais fracas: Saúde Coletiva (48%) e Ética e Legislação (55%).'
                        : 'Depois do diagnóstico, treine por matéria começando pelas mais fracas.',
                    cta: 'Treinar pontos fracos',
                    state: score != null ? 'current' : 'upcoming',
                  },
                  {
                    title: 'Reta final',
                    desc: 'Simulados cronometrados completos até passar do corte com folga.',
                    cta: null,
                    state: 'upcoming',
                  },
                ] as Array<{ title: string; desc: string; cta: string | null; state: 'done' | 'current' | 'upcoming' }>
              ).map((step, i, arr) => (
                <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < arr.length - 1 && <span className="absolute left-3 top-7 h-full w-px bg-slate-200" />}
                  {step.state === 'done' ? (
                    <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
                      <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  ) : step.state === 'current' ? (
                    <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white ring-4 ring-cyan-100">{i + 1}</span>
                  ) : (
                    <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-bold text-slate-400">{i + 1}</span>
                  )}
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-sm font-bold ${step.state === 'upcoming' ? 'text-slate-400' : 'text-slate-900'}`}>{step.title}</p>
                    <p className={`mt-0.5 text-sm leading-6 ${step.state === 'upcoming' ? 'text-slate-400' : 'text-slate-600'}`}>{step.desc}</p>
                    {step.state === 'current' && step.cta && (
                      <button className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
                        <PlayIcon className="h-4 w-4" />
                        {step.cta}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* O bloco de matérias muda de natureza com o tempo:
              prova passada → fato (o que caiu nesta prova; o programático sai
              de cena, a prova já o materializou);
              prova futura → escopo oficial (conteúdo programático) + padrão
              histórico da banca, rotulado como estimativa. */}
          {tState === 'past' ? (
            <SubjectDistribution
              title="O que caiu na prova"
              subtitle={`Composição das ${subjectData.totalQuestions} questões aplicadas em 23/08/2022`}
              data={subjectData}
              meters={meters}
              enterIdx={2}
              predictive={false}
            />
          ) : (
            <>
              <section {...{ style: enter(2).style }} className={`${enter(2).className} ${CARD} p-5 sm:p-6`}>
                <h2 className="text-base font-bold text-slate-900">Conteúdo programático</h2>
                <p className="mt-0.5 text-sm text-slate-500">O que pode ser cobrado, conforme o Edital 01/{year}</p>
                <div className="mt-3 flex flex-col divide-y divide-slate-100">
                  {SYLLABUS.map((s) => (
                    <details key={s.group} className="group py-1">
                      <summary className="-mx-2 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 hover:text-cyan-700 [&::-webkit-details-marker]:hidden">
                        {s.group}
                        <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
                      </summary>
                      <p className="max-w-prose pb-2.5 pl-2 text-sm leading-6 text-slate-600">{s.topics}</p>
                    </details>
                  ))}
                </div>
              </section>

              <SubjectDistribution
                title="O que a Cebraspe costuma cobrar"
                subtitle="Padrão das provas de 2022 e 2019 deste cargo — estimativa, não garantia"
                data={subjectData}
                meters={meters}
                enterIdx={3}
                predictive
              />
            </>
          )}

          {/* Concorrência histórica */}
          <section {...{ style: enter(4).style }} className={`${enter(4).className} ${CARD} p-5 sm:p-6`}>
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900">Concorrência histórica</h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Edições anteriores deste cargo na mesma instituição</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[24rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400">
                    <th className="pb-2 font-semibold">Ano</th>
                    <th className="pb-2 text-right font-semibold">Inscritos</th>
                    <th className="pb-2 text-right font-semibold">Concorrência</th>
                    <th className="pb-2 text-right font-semibold">Nota de corte</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORY.map((h) => (
                    <tr key={h.year} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60">
                      <td className="py-2.5 font-semibold text-slate-800">{h.year}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{h.applicants}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{h.perVacancy}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">{h.cut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ░░ Sidebar — ficha do cargo ░░ */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <FichaCard title="Ficha do cargo" hero={fichaHero} rows={ficha} editalUrl={EDITAL_URL} enterIdx={2} />

          <section {...{ style: enter(3).style }} className={`${enter(3).className} ${CARD} p-5`}>
            <h2 className="text-sm font-bold text-slate-900">Provas anteriores</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Treine com as provas reais deste cargo.</p>
            <div className="mt-3 flex flex-col gap-2">
              {HISTORY.map((h) => (
                <button key={h.year} className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-cyan-300 hover:bg-cyan-50/40 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
                  <span className="inline-flex items-center gap-2">
                    <DocumentTextIcon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-cyan-600" />
                    Prova {h.year}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-600" />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Barra de ação fixa (mobile) */}
      <div
        className="fixed inset-x-0 z-30 px-4 lg:hidden"
        style={{ bottom: 'calc(var(--mobile-bottom-nav-height) + var(--safe-area-inset-bottom) + 0.5rem)' }}
      >
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 text-sm font-semibold text-white shadow-lg shadow-cyan-900/25 transition-colors hover:bg-cyan-700">
          <PlayIcon className="h-5 w-5" />
          {ctaLabel}
        </button>
      </div>
    </>
  )
}
