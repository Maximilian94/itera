import { createFileRoute } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  BookOpenIcon,
  BookmarkIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  FunnelIcon,
  HomeIcon as HomeIconOutline,
  MagnifyingGlassIcon,
  PlayIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon,
  DocumentTextIcon as DocumentTextIconSolid,
  AcademicCapIcon as AcademicCapIconSolid,
  ClockIcon as ClockIconSolid,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'

export const Route = createFileRoute('/mobile-preview')({
  component: MobilePreviewPage,
})

function MobilePreviewPage() {
  return (
    <div className="min-h-full w-full overflow-auto bg-slate-900 p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-8">
        <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
          Protótipo estático
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
          Mobile UX/UI — Itera
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Dez telas-chave do funil mobile repensadas para uso no celular: alvos
          grandes, hierarquia vertical, navegação por bottom nav e CTAs sempre
          ao alcance do polegar.
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 justify-items-center">
        <PhoneFrame label="1 · Sign-in">
          <SignInMobile />
        </PhoneFrame>
        <PhoneFrame label="2 · Dashboard / Home">
          <DashboardMobile />
        </PhoneFrame>
        <PhoneFrame label="3 · Lista de Exams">
          <ExamsMobile />
        </PhoneFrame>
        <PhoneFrame label="4 · Player de questão">
          <ExamPlayerMobile />
        </PhoneFrame>
        <PhoneFrame label="5 · Treino">
          <TreinoMobile />
        </PhoneFrame>
        <PhoneFrame label="6 · Planos">
          <PlanosMobile />
        </PhoneFrame>
        <PhoneFrame label="7 · Feedback da questão">
          <FeedbackMobile />
        </PhoneFrame>
        <PhoneFrame label="8 · Diagnóstico">
          <DiagnosticoMobile />
        </PhoneFrame>
        <PhoneFrame label="9 · Estudo">
          <EstudoMobile />
        </PhoneFrame>
        <PhoneFrame label="10 · Final do treino">
          <FinalMobile />
        </PhoneFrame>
      </div>

      <footer className="max-w-6xl mx-auto mt-10 text-xs text-slate-500 text-center">
        Renderizado como mockup estático em{' '}
        <code className="text-slate-400">/mobile-preview</code>. Nenhuma chamada
        de API — apenas HTML/Tailwind.
      </footer>
    </div>
  )
}

/* ================================================================ */
/*  Phone Frame                                                      */
/* ================================================================ */

function PhoneFrame({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <span className="text-[0.7rem] uppercase tracking-widest text-slate-400 font-semibold">
        {label}
      </span>
      <div className="relative w-[320px] h-[680px] rounded-[44px] bg-slate-950 p-3 shadow-2xl shadow-black/60 ring-1 ring-white/5">
        {/* notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-b-2xl z-20" />
        <div className="w-full h-full rounded-[34px] overflow-hidden bg-slate-50 relative">
          {/* status bar */}
          <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-5 text-[0.6rem] font-semibold text-slate-800 z-10">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span>􀙇</span>
              <span>􀋦</span>
              <span>100%</span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ================================================================ */
/*  1. Sign-in Mobile                                                */
/* ================================================================ */

function SignInMobile() {
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950 text-white">
      <div className="h-6" />
      {/* decorative blobs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute top-40 -left-10 w-40 h-40 rounded-full bg-teal-500/20 blur-3xl" />

      <div className="flex-1 flex flex-col justify-between px-6 pt-12 pb-8 relative z-10">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-700 flex items-center justify-center shadow-lg shadow-cyan-900/40 mb-6">
            <AcademicCapIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-slate-300 mt-2">
            Entre para continuar seus treinos e acompanhar sua evolução.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[0.7rem] uppercase tracking-wide text-slate-400 font-semibold">
              E-mail
            </label>
            <div className="mt-1.5 h-12 rounded-xl bg-white/10 border border-white/15 px-4 flex items-center text-sm text-slate-200">
              voce@email.com
            </div>
          </div>
          <div>
            <label className="text-[0.7rem] uppercase tracking-wide text-slate-400 font-semibold">
              Senha
            </label>
            <div className="mt-1.5 h-12 rounded-xl bg-white/10 border border-white/15 px-4 flex items-center justify-between text-sm text-slate-200">
              <span className="tracking-[0.3em]">••••••••</span>
              <span className="text-xs text-cyan-300 font-semibold">
                Mostrar
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-cyan-300 font-medium">
              Esqueci minha senha
            </span>
          </div>

          <button
            type="button"
            className="mt-2 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold text-sm shadow-lg shadow-cyan-900/40"
          >
            Entrar
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[0.65rem] text-slate-400 uppercase tracking-wide">
              ou
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            className="h-12 rounded-xl bg-white text-slate-800 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500" />
            Continuar com Google
          </button>
        </div>

        <div className="text-center text-xs text-slate-400">
          Não tem uma conta?{' '}
          <span className="text-cyan-300 font-semibold">Criar agora</span>
        </div>
      </div>
    </div>
  )
}

/* ================================================================ */
/*  2. Dashboard Mobile                                              */
/* ================================================================ */

function DashboardMobile() {
  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="pt-8 pb-3 px-5 bg-gradient-to-br from-cyan-600 to-sky-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-100/80">Boa tarde,</p>
            <p className="text-lg font-bold">Maximilian</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <BellIcon className="w-5 h-5 text-white" />
            </div>
            <div className="w-9 h-9 rounded-full bg-white border-2 border-white/60 flex items-center justify-center text-cyan-700 text-xs font-bold">
              MK
            </div>
          </div>
        </div>

        {/* Treinos do mês strip */}
        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] text-cyan-100/80">Treinos do mês</p>
            <p className="text-sm font-semibold">3 usados / 10 disponíveis</p>
            <div className="mt-1.5 h-1 w-full rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-[30%] rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24">
        {/* Continue CTA */}
        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-600 flex items-center justify-center shrink-0">
            <PlayIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-700/70 font-medium">
              Exame em andamento
            </p>
            <p className="text-sm font-semibold text-cyan-900 truncate">
              Prefeitura de Santos · 2024
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center">
            <ChevronRightIcon className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Evolução card */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Evolução da nota
            </p>
          </div>
          <div className="mt-3 flex items-end gap-2 justify-between h-20">
            {[45, 52, 48, 60, 58, 67, 72].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-cyan-200 to-cyan-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.65rem] text-slate-400">últimas 7</span>
            <span className="text-xs font-semibold text-emerald-600">
              +8.4 p.p.
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Ações rápidas
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <ActionTile
            icon={RocketLaunchIcon}
            tint="cyan"
            title="Novo treino"
            subtitle="Comece agora"
            primary
          />
          <ActionTile
            icon={DocumentTextIcon}
            tint="violet"
            title="Exames"
            subtitle="Explorar provas"
          />
          <ActionTile
            icon={BuildingLibraryIcon}
            tint="amber"
            title="Bancas"
            subtitle="Por órgão"
          />
          <ActionTile
            icon={ClockIcon}
            tint="slate"
            title="Histórico"
            subtitle="Suas tentativas"
          />
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  )
}

function ActionTile({
  icon: Icon,
  title,
  subtitle,
  tint,
  primary = false,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  subtitle: string
  tint: 'cyan' | 'violet' | 'amber' | 'slate'
  primary?: boolean
}) {
  const tints: Record<string, { bg: string; icon: string }> = {
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600' },
  }
  const t = tints[tint]
  return (
    <div
      className={`rounded-2xl border p-3 ${
        primary
          ? 'bg-cyan-50 border-cyan-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center mb-2`}
      >
        <Icon className={`w-4.5 h-4.5 ${t.icon}`} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-[0.65rem] text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

/* ================================================================ */
/*  3. Exams List Mobile                                             */
/* ================================================================ */

function ExamsMobile() {
  const exams: Array<{
    title: string
    board: string
    date: string
    scope: 'Municipal' | 'Estadual' | 'Federal'
    questions: number
    bestScore?: number
  }> = [
    {
      title: 'Enfermeiro · Prefeitura de Santos',
      board: 'VUNESP',
      date: 'Mar/2024',
      scope: 'Municipal',
      questions: 60,
      bestScore: 78,
    },
    {
      title: 'Técnico de Enfermagem · SUS-SP',
      board: 'FGV',
      date: 'Fev/2024',
      scope: 'Estadual',
      questions: 50,
      bestScore: 54,
    },
    {
      title: 'Enfermeiro · Ministério da Saúde',
      board: 'CEBRASPE',
      date: 'Jan/2024',
      scope: 'Federal',
      questions: 80,
    },
    {
      title: 'Enfermeiro · Prefeitura de Campinas',
      board: 'IBFC',
      date: 'Dez/2023',
      scope: 'Municipal',
      questions: 50,
      bestScore: 42,
    },
    {
      title: 'Téc. Enfermagem · HC-UFMG',
      board: 'FUNDEP',
      date: 'Out/2023',
      scope: 'Estadual',
      questions: 40,
    },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="pt-8 pb-3 px-5 bg-gradient-to-br from-violet-700 to-violet-900 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-violet-200/80">Explorar</p>
            <p className="text-lg font-bold">Exames</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <FunnelIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-3 flex items-center gap-4 text-white">
          <div>
            <p className="text-lg font-bold tabular-nums">248</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-violet-200/70">
              Provas
            </p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-lg font-bold tabular-nums">14.2k</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-violet-200/70">
              Questões
            </p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-lg font-bold tabular-nums">12</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-violet-200/70">
              Feitas
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-4">
        <div className="h-11 rounded-xl bg-white border border-slate-200 flex items-center px-3.5 gap-2">
          <MagnifyingGlassIcon className="w-4.5 h-4.5 text-slate-400" />
          <span className="text-sm text-slate-400">
            Buscar cargo, banca, cidade…
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex items-center gap-2 px-4 overflow-hidden">
        <Chip active>Todos</Chip>
        <Chip>Municipal</Chip>
        <Chip>Estadual</Chip>
        <Chip>SP</Chip>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden mt-3 px-4 pb-24 space-y-2">
        {exams.map((exam, i) => (
          <ExamCardMobile key={i} exam={exam} />
        ))}
      </div>

      <BottomNav active="exams" />
    </div>
  )
}

function Chip({
  children,
  active,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
        active
          ? 'bg-violet-600 text-white'
          : 'bg-white border border-slate-200 text-slate-600'
      }`}
    >
      {children}
    </span>
  )
}

function ExamCardMobile({
  exam,
}: {
  exam: {
    title: string
    board: string
    date: string
    scope: 'Municipal' | 'Estadual' | 'Federal'
    questions: number
    bestScore?: number
  }
}) {
  const scopeColors = {
    Municipal: 'bg-cyan-50 text-cyan-700',
    Estadual: 'bg-violet-50 text-violet-700',
    Federal: 'bg-amber-50 text-amber-700',
  }
  const scoreColor = (s: number) =>
    s >= 70
      ? 'bg-emerald-100 text-emerald-700'
      : s >= 50
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-600'

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-3">
      {/* score or placeholder */}
      <div className="w-11 h-11 shrink-0">
        {exam.bestScore != null ? (
          <div
            className={`w-full h-full rounded-xl flex items-center justify-center text-sm font-bold tabular-nums ${scoreColor(exam.bestScore)}`}
          >
            {exam.bestScore}%
          </div>
        ) : (
          <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.82rem] font-semibold text-slate-800 truncate leading-tight">
          {exam.title}
        </p>
        <p className="text-[0.65rem] text-slate-400 mt-0.5">
          {exam.board} · {exam.date}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`text-[0.58rem] font-semibold px-1.5 py-px rounded-full ${scopeColors[exam.scope]}`}
          >
            {exam.scope}
          </span>
          <span className="text-[0.6rem] text-slate-400 flex items-center gap-0.5">
            <DocumentTextIcon className="w-2.5 h-2.5" />
            {exam.questions}
          </span>
        </div>
      </div>

      <ArrowRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
    </div>
  )
}

/* ================================================================ */
/*  Shared Bottom Nav                                                */
/* ================================================================ */

function BottomNav({ active }: { active: 'home' | 'exams' | 'treino' | 'history' | 'account' }) {
  const items: Array<{
    key: typeof active
    label: string
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    iconSolid: React.ComponentType<React.SVGProps<SVGSVGElement>>
  }> = [
    { key: 'home', label: 'Home', icon: HomeIconOutline, iconSolid: HomeIcon },
    {
      key: 'exams',
      label: 'Exames',
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid,
    },
    {
      key: 'treino',
      label: 'Treino',
      icon: AcademicCapIcon,
      iconSolid: AcademicCapIconSolid,
    },
    {
      key: 'history',
      label: 'Histórico',
      icon: ClockIcon,
      iconSolid: ClockIconSolid,
    },
    { key: 'account', label: 'Perfil', icon: UserIcon, iconSolid: UserIcon },
  ]

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 pt-2 pb-4">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = item.key === active
          const Icon = isActive ? item.iconSolid : item.icon
          return (
            <div
              key={item.key}
              className="flex flex-col items-center gap-0.5 flex-1 py-1"
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-cyan-600' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[0.6rem] font-medium ${
                  isActive ? 'text-cyan-600' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  4. Exam Player Mobile                                            */
/* ================================================================ */

function ExamPlayerMobile() {
  const alternatives = [
    {
      key: 'A',
      text: 'Administrar oxigênio suplementar sob cateter nasal a 3 L/min.',
    },
    {
      key: 'B',
      text: 'Elevar a cabeceira do leito a 30° e manter o paciente em decúbito lateral.',
      selected: true,
    },
    {
      key: 'C',
      text: 'Solicitar exames laboratoriais de urgência antes da intervenção.',
    },
    {
      key: 'D',
      text: 'Iniciar reposição volêmica com solução fisiológica 0,9%.',
    },
    { key: 'E', text: 'Aguardar avaliação médica para qualquer conduta.' },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar sticky */}
      <div className="pt-8 pb-2 px-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
          >
            <XMarkIcon className="w-4.5 h-4.5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] text-slate-400 font-medium truncate">
              Prefeitura de Santos · 2024
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                7 / 60
              </span>
              <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-[12%] bg-cyan-500 rounded-full" />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
          >
            <BookmarkIcon className="w-4.5 h-4.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-32">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[0.6rem] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            Clínica médica
          </span>
          <span className="text-[0.6rem] text-slate-400">
            Insuficiência respiratória
          </span>
        </div>

        <p className="text-[0.9rem] leading-relaxed text-slate-800 font-medium">
          Paciente de 68 anos é admitido na UTI com dispneia intensa, SpO₂ 86%
          em ar ambiente e agitação psicomotora.
        </p>
        <p className="text-[0.85rem] leading-relaxed text-slate-700 mt-2">
          Qual a{' '}
          <span className="font-semibold underline decoration-cyan-300">
            primeira
          </span>{' '}
          conduta do enfermeiro?
        </p>

        {/* Alternatives */}
        <div className="mt-4 space-y-2">
          {alternatives.map((alt) => (
            <AlternativeRow
              key={alt.key}
              letter={alt.key}
              text={alt.text}
              selected={alt.selected}
            />
          ))}
        </div>

        <button
          type="button"
          className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium py-2"
        >
          <FlagIcon className="w-3.5 h-3.5" />
          Reportar problema na questão
        </button>
      </div>

      {/* Sticky bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pt-3 pb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <button
            type="button"
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
          >
            Próxima
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AlternativeRow({
  letter,
  text,
  selected,
}: {
  letter: string
  text: string
  selected?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
        selected
          ? 'border-cyan-500 bg-cyan-50/80 ring-2 ring-cyan-200'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
          selected ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {letter}
      </div>
      <p
        className={`text-[0.82rem] leading-snug ${
          selected ? 'text-cyan-900 font-medium' : 'text-slate-700'
        }`}
      >
        {text}
      </p>
    </div>
  )
}

/* ================================================================ */
/*  5. Treino Mobile                                                 */
/* ================================================================ */

function TreinoMobile() {
  const stages = [
    { label: 'Prova', tone: 'bg-cyan-100 text-cyan-700', active: true },
    { label: 'Diagnóstico', tone: 'bg-amber-100 text-amber-700' },
    { label: 'Estudo', tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Retentativa', tone: 'bg-violet-100 text-violet-700' },
    { label: 'Final', tone: 'bg-rose-100 text-rose-700' },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="pt-8 pb-4 px-5 bg-gradient-to-br from-cyan-600 to-sky-800 text-white">
        <p className="text-xs text-cyan-100/80">Sua jornada</p>
        <p className="text-lg font-bold">Treino</p>
        <p className="text-[0.7rem] text-cyan-100/80 mt-1 leading-snug">
          Seu erro vira plano de estudo.
        </p>

        {/* KPI strip */}
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-lg font-bold tabular-nums">8</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-cyan-100/70">
              Total
            </p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-lg font-bold tabular-nums">5</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-cyan-100/70">
              Concluídos
            </p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-lg font-bold tabular-nums">82%</p>
            <p className="text-[0.6rem] uppercase tracking-widest text-cyan-100/70">
              Melhor
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24">
        {/* Create CTA */}
        <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <RocketLaunchIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              Criar novo treino
            </p>
            <p className="text-[0.65rem] text-emerald-700/80">
              5 disponíveis este mês
            </p>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-emerald-700 shrink-0" />
        </div>

        {/* How it works stepper */}
        <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Como funciona
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`shrink-0 w-20 rounded-xl p-2.5 text-center border ${
                stage.active
                  ? 'border-cyan-300 bg-white shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${stage.tone}`}
              >
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <p className="text-[0.6rem] font-semibold text-slate-700 mt-1.5 leading-tight">
                {stage.label}
              </p>
            </div>
          ))}
        </div>

        {/* In progress */}
        <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Em andamento · 3
        </p>
        <div className="mt-2 space-y-2">
          <ActiveTrainingMobile
            title="Pref. Santos · Enfermeiro"
            stage="Estudando"
            stageTone="bg-emerald-100 text-emerald-700"
            progress={60}
            date="hoje · 14:32"
          />
          <ActiveTrainingMobile
            title="SUS-SP · Téc. Enfermagem"
            stage="Diagnóstico"
            stageTone="bg-amber-100 text-amber-700"
            progress={40}
            date="ontem"
          />
        </div>

        {/* Concluded */}
        <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Concluídos · 5
        </p>
        <div className="mt-2 space-y-2">
          <ConcludedTrainingMobile
            title="Pref. Campinas"
            before={54}
            after={78}
            date="08/04"
          />
          <ConcludedTrainingMobile
            title="HC-UFMG"
            before={42}
            after={65}
            date="22/03"
          />
        </div>
      </div>

      <BottomNav active="treino" />
    </div>
  )
}

function ActiveTrainingMobile({
  title,
  stage,
  stageTone,
  progress,
  date,
}: {
  title: string
  stage: string
  stageTone: string
  progress: number
  date: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-cyan-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate flex-1">
            {title}
          </p>
          <ChevronRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${stageTone}`}
          >
            {stage}
          </span>
          <span className="text-[0.6rem] text-slate-400">{date}</span>
        </div>
      </div>
    </div>
  )
}

function ConcludedTrainingMobile({
  title,
  before,
  after,
  date,
}: {
  title: string
  before: number
  after: number
  date: string
}) {
  const gain = after - before
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[0.65rem]">
          <span className="text-slate-400 tabular-nums">{before}%</span>
          <ArrowRightIcon className="w-2.5 h-2.5 text-slate-300" />
          <span className="font-semibold text-emerald-700 tabular-nums">
            {after}%
          </span>
          <span className="text-[0.55rem] text-emerald-600 font-semibold px-1.5 py-px bg-emerald-50 rounded-full">
            +{gain} p.p.
          </span>
        </div>
      </div>
      <span className="text-[0.6rem] text-slate-400 shrink-0">{date}</span>
    </div>
  )
}

/* ================================================================ */
/*  6. Planos Mobile                                                 */
/* ================================================================ */

function PlanosMobile() {
  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="pt-8 pb-4 px-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeftIcon className="w-4.5 h-4.5 text-white" />
          </button>
          <p className="text-sm font-semibold">Planos</p>
          <div className="w-9" />
        </div>

        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold leading-tight">
            Escolha o plano ideal
          </h1>
          <p className="text-xs text-slate-300/80 mt-1.5 leading-snug">
            Provas reais, IA e treinos inteligentes.
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-4 mx-auto w-fit flex items-center gap-1 bg-white/10 rounded-full p-1">
          <button
            type="button"
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300"
          >
            Mensal
          </button>
          <button
            type="button"
            className="px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5"
          >
            Anual
            <span className="text-[0.6rem] text-emerald-600">-20%</span>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24 space-y-3">
        <PlanCardMobile
          icon={AcademicCapIcon}
          name="Essencial"
          subtitle="Para começar"
          price="R$ 29"
          features={['3 treinos/mês', 'Todas as provas', 'Explicações da IA']}
        />
        <PlanCardMobile
          icon={SparklesIcon}
          name="Estratégico"
          subtitle="Mais popular"
          price="R$ 49"
          popular
          features={[
            '10 treinos/mês',
            'Diagnóstico com IA',
            'Plano de estudo personalizado',
            'Ciclo de reavaliação',
          ]}
        />
        <PlanCardMobile
          icon={TrophyIcon}
          name="Elite"
          subtitle="Para quem quer passar"
          price="R$ 79"
          features={[
            'Treinos ilimitados',
            'Prioridade no suporte',
            'Todos os benefícios',
          ]}
        />

        <p className="pt-2 text-center text-[0.65rem] text-slate-400 leading-snug">
          Em até 7 dias você pode solicitar reembolso sem justificativa
          (CDC Art. 49).
        </p>
      </div>
    </div>
  )
}

function PlanCardMobile({
  icon: Icon,
  name,
  subtitle,
  price,
  features,
  popular,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  name: string
  subtitle: string
  price: string
  features: string[]
  popular?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 bg-white p-4 ${
        popular ? 'border-cyan-500 shadow-lg shadow-cyan-100' : 'border-slate-200'
      }`}
    >
      {popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-cyan-500 text-white text-[0.6rem] font-bold rounded-full uppercase tracking-wide">
          Mais popular
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            popular ? 'bg-cyan-100' : 'bg-slate-100'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              popular ? 'text-cyan-600' : 'text-slate-600'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900">{name}</p>
          <p className="text-[0.65rem] text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">
            {price}
          </p>
          <p className="text-[0.6rem] text-slate-400">/mês</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[0.78rem] text-slate-700"
          >
            <CheckIcon
              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                popular ? 'text-cyan-500' : 'text-emerald-500'
              }`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`mt-4 w-full h-11 rounded-xl text-sm font-semibold ${
          popular
            ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-900/20'
            : 'bg-slate-100 text-slate-800'
        }`}
      >
        Assinar
      </button>
    </div>
  )
}

/* ================================================================ */
/*  7. Feedback da questão (explicação das alternativas)             */
/* ================================================================ */

function FeedbackMobile() {
  const alternatives = [
    {
      key: 'A',
      text: 'Administrar oxigênio suplementar sob cateter nasal a 3 L/min.',
      state: 'wrong' as const,
      selected: true,
      explanation:
        'Oxigênio por cateter pode ajudar, mas não é a **primeira** conduta — antes é preciso otimizar a ventilação com posicionamento.',
    },
    {
      key: 'B',
      text: 'Elevar a cabeceira do leito a 30° e manter decúbito lateral.',
      state: 'correct' as const,
      explanation:
        'Correto. Posicionamento é a **primeira intervenção**: reduz o trabalho respiratório e melhora a oxigenação sem depender de prescrição.',
    },
    {
      key: 'C',
      text: 'Solicitar exames laboratoriais de urgência.',
      state: 'neutral' as const,
      explanation:
        'Exames são importantes, porém não prioritários em uma situação aguda antes da estabilização.',
    },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="pt-8 pb-2 px-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
          >
            <ArrowLeftIcon className="w-4.5 h-4.5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] text-slate-400 font-medium truncate">
              Feedback · questão 7 de 60
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <XCircleIcon className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs font-semibold text-rose-600">
                Você errou
              </span>
            </div>
          </div>
          <div className="w-9 h-9" />
        </div>

        {/* Tabs */}
        <div className="mt-2 flex items-center gap-1 -mx-3 px-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FeedbackTab icon={PlayIcon} label="Questão" />
          <FeedbackTab icon={BookOpenIcon} label="Explicação" active />
          <FeedbackTab icon={ChartBarIcon} label="Estatísticas" dim />
          <FeedbackTab icon={ChatBubbleLeftRightIcon} label="Comentários" dim />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24 space-y-3">
        {/* Correct alt hero */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircleIcon className="w-4 h-4" />
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide">
              Resposta correta · B
            </p>
          </div>
          <p className="text-[0.82rem] leading-snug">
            Elevar a cabeceira do leito a 30° e manter decúbito lateral.
          </p>
        </div>

        {alternatives.map((alt) => (
          <FeedbackAltCard
            key={alt.key}
            letter={alt.key}
            text={alt.text}
            state={alt.state}
            selected={alt.selected}
            explanation={alt.explanation}
          />
        ))}
      </div>

      {/* Sticky bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pt-3 pb-6">
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          Próxima questão
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function FeedbackTab({
  icon: Icon,
  label,
  active,
  dim,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  active?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2 border-b-2 ${
        active
          ? 'border-cyan-500 text-cyan-600'
          : dim
            ? 'border-transparent text-slate-300'
            : 'border-transparent text-slate-500'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[0.7rem] font-semibold whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

function FeedbackAltCard({
  letter,
  text,
  state,
  selected,
  explanation,
}: {
  letter: string
  text: string
  state: 'correct' | 'wrong' | 'neutral'
  selected?: boolean
  explanation: string
}) {
  const l = letter

  const styles = {
    correct: {
      card: 'border-green-400 bg-green-50',
      badge: 'bg-green-600 text-white',
      text: 'text-green-900',
      expl: 'bg-green-50/70 border-green-200',
      label: 'Resposta correta',
      labelTone: 'bg-green-200 text-green-800',
    },
    wrong: {
      card: 'border-rose-400 bg-rose-50',
      badge: 'bg-rose-600 text-white',
      text: 'text-rose-900',
      expl: 'bg-rose-50/70 border-rose-200',
      label: 'Sua resposta',
      labelTone: 'bg-rose-200 text-rose-800',
    },
    neutral: {
      card: 'border-slate-200 bg-white',
      badge: 'bg-slate-200 text-slate-700',
      text: 'text-slate-700',
      expl: 'bg-slate-50 border-slate-200',
      label: '',
      labelTone: '',
    },
  }[state]

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${styles.card}`}>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${styles.badge}`}
          >
            {l}
          </span>
          {state !== 'neutral' && (
            <span
              className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full ${styles.labelTone}`}
            >
              {styles.label}
            </span>
          )}
          {selected && state !== 'wrong' && (
            <span className="text-[0.6rem] text-slate-500">· você marcou</span>
          )}
        </div>
        <p className={`text-[0.8rem] leading-snug ${styles.text}`}>{text}</p>
      </div>
      <div className={`border-t px-3 py-2.5 ${styles.expl}`}>
        <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Explicação
        </p>
        <p className="text-[0.76rem] leading-snug text-slate-700">
          {explanation}
        </p>
      </div>
    </div>
  )
}

/* ================================================================ */
/*  8. Diagnóstico Mobile                                            */
/* ================================================================ */

function DiagnosticoMobile() {
  const subjects = [
    { name: 'Enfermagem em UTI', score: 32, state: 'weak' as const },
    { name: 'Saúde mental', score: 48, state: 'weak' as const },
    { name: 'Ética profissional', score: 62, state: 'medium' as const },
    { name: 'Administração em saúde', score: 71, state: 'strong' as const },
    { name: 'Saúde pública (SUS)', score: 85, state: 'strong' as const },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top */}
      <div className="pt-8 pb-4 px-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[0.65rem] text-amber-100/80 font-medium">
              Etapa 2 de 5 · Treino
            </p>
            <p className="text-base font-bold leading-tight">Diagnóstico</p>
          </div>
        </div>
        <p className="text-[0.72rem] text-amber-100/90 mt-2 leading-snug">
          Identificamos seus pontos fracos. Estude 3 matérias e melhore no
          próximo ciclo.
        </p>

        {/* Score summary */}
        <div className="mt-3 rounded-xl bg-white/10 backdrop-blur p-3 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
            <span className="text-xl font-bold text-amber-600 tabular-nums">
              54%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[0.7rem] text-amber-100/80">Sua nota</p>
            <p className="text-sm font-semibold">32 de 60 corretas</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <XCircleIcon className="w-3 h-3 text-rose-200" />
              <span className="text-[0.65rem] text-rose-100">
                Abaixo da nota de corte (60%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Desempenho por matéria
        </p>
        <div className="mt-2 space-y-2">
          {subjects.map((s) => (
            <SubjectBar key={s.name} {...s} />
          ))}
        </div>

        {/* AI feedback */}
        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-xs font-semibold text-cyan-900">Análise da IA</p>
          </div>
          <p className="text-[0.76rem] text-slate-700 leading-snug">
            Você domina <b>Saúde pública</b> e <b>Administração</b>. Foque as
            próximas horas em <b>UTI</b> e <b>Saúde mental</b> — ali está 80%
            do seu potencial de ganho.
          </p>
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pt-3 pb-6">
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <BookOpenIcon className="w-4 h-4" />
          Começar a estudar
        </button>
      </div>
    </div>
  )
}

function SubjectBar({
  name,
  score,
  state,
}: {
  name: string
  score: number
  state: 'weak' | 'medium' | 'strong'
}) {
  const tone = {
    weak: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
    medium: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    strong: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
  }[state]
  const label = { weak: 'Ponto fraco', medium: 'Médio', strong: 'Forte' }[state]

  return (
    <div className={`rounded-xl border border-slate-200 p-3 ${tone.bg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[0.8rem] font-semibold text-slate-800 truncate pr-2">
          {name}
        </p>
        <span className={`text-[0.65rem] font-bold tabular-nums ${tone.text}`}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className={`text-[0.55rem] font-semibold ${tone.text}`}>
          {label}
        </span>
      </div>
    </div>
  )
}

/* ================================================================ */
/*  9. Estudo Mobile                                                 */
/* ================================================================ */

function EstudoMobile() {
  const subjects = [
    {
      id: '1',
      title: 'Enfermagem em UTI',
      topic: 'Insuficiência respiratória aguda',
      exercises: 6,
      done: true,
    },
    {
      id: '2',
      title: 'Saúde mental',
      topic: 'Transtornos afetivos',
      exercises: 5,
      done: false,
      expanded: true,
    },
    {
      id: '3',
      title: 'Ética profissional',
      topic: 'Responsabilidade civil',
      exercises: 4,
      done: false,
    },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      {/* Top */}
      <div className="pt-8 pb-3 px-5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpenIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[0.65rem] text-emerald-100/80 font-medium">
              Etapa 3 de 5 · Treino
            </p>
            <p className="text-base font-bold leading-tight">Estudo</p>
          </div>
        </div>
        <p className="text-[0.72rem] text-emerald-100/90 mt-2 leading-snug">
          Leia cada assunto e marque como pronto. Depois você refaz as questões.
        </p>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums">1 / 3</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full w-[33%] rounded-full bg-white" />
          </div>
          <span className="text-[0.7rem] font-semibold">33%</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-24 space-y-2.5">
        {subjects.map((s) => (
          <StudyCard key={s.id} {...s} />
        ))}

        <div className="pt-1 flex items-center justify-center">
          <button
            type="button"
            className="text-xs text-slate-500 font-medium inline-flex items-center gap-1.5"
          >
            Pular para retentativa
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function StudyCard({
  title,
  topic,
  exercises,
  done,
  expanded,
}: {
  title: string
  topic: string
  exercises: number
  done: boolean
  expanded?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        done
          ? 'border-emerald-300 bg-emerald-50/60'
          : expanded
            ? 'border-cyan-300 bg-white shadow-sm'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="p-3 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            done ? 'bg-emerald-600' : 'bg-slate-100'
          }`}
        >
          {done ? (
            <CheckIcon className="w-4.5 h-4.5 text-white" strokeWidth={3} />
          ) : (
            <BookOpenIcon className="w-4.5 h-4.5 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${
              done ? 'text-emerald-900 line-through' : 'text-slate-800'
            }`}
          >
            {title}
          </p>
          <p className="text-[0.65rem] text-slate-500 truncate">{topic}</p>
        </div>
        {!expanded && (
          <ChevronRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          <p className="text-[0.76rem] leading-snug text-slate-700">
            <b>Transtornos afetivos</b> incluem depressão e transtorno bipolar.
            O enfermeiro deve observar sinais de ideação suicida e manter
            vínculo terapêutico. Intervenções não-farmacológicas são prioritárias
            em fases estáveis.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex-1 h-10 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
            >
              <DocumentTextIcon className="w-3.5 h-3.5" />
              {exercises} exercícios
            </button>
            <button
              type="button"
              className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
              Marcar pronto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================ */
/*  10. Final do treino Mobile                                       */
/* ================================================================ */

function FinalMobile() {
  const before = 54
  const after = 78
  const gain = after - before

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-slate-50 to-emerald-50/40">
      {/* Hero */}
      <div className="pt-10 pb-6 px-5 text-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-8 w-2 h-2 rounded-full bg-white" />
          <div className="absolute top-12 right-10 w-1.5 h-1.5 rounded-full bg-white" />
          <div className="absolute top-20 left-16 w-1 h-1 rounded-full bg-white" />
          <div className="absolute top-6 right-4 w-1 h-1 rounded-full bg-white" />
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <TrophyIcon className="w-8 h-8 text-white" />
          </div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-100/90">
            Treino concluído
          </p>
          <h1 className="text-xl font-bold mt-1">Você evoluiu!</h1>
          <p className="text-[0.7rem] text-emerald-100/90 mt-1 leading-snug">
            Prefeitura de Santos · Enfermeiro
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden px-4 -mt-5 pb-24">
        {/* Before / After card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400">
                Antes
              </p>
              <p className="text-2xl font-bold text-slate-400 tabular-nums mt-0.5">
                {before}%
              </p>
              <span className="inline-flex items-center gap-1 mt-1 text-[0.6rem] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                <XCircleIcon className="w-2.5 h-2.5" />
                Reprovado
              </span>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <ArrowRightIcon className="w-5 h-5 text-emerald-500" />
              <span className="text-[0.6rem] font-bold text-emerald-600 mt-1">
                +{gain} p.p.
              </span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-600">
                Depois
              </p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                {after}%
              </p>
              <span className="inline-flex items-center gap-1 mt-1 text-[0.6rem] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                <CheckCircleIcon className="w-2.5 h-2.5" />
                Aprovado
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatMini label="Questões revistas" value="28" />
          <StatMini label="Matérias" value="5" />
          <StatMini label="Tempo" value="2h 14m" />
        </div>

        {/* Key improvements */}
        <p className="mt-5 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
          Maiores ganhos
        </p>
        <div className="mt-2 space-y-1.5">
          <ImprovementRow subject="Enfermagem em UTI" from={32} to={72} />
          <ImprovementRow subject="Saúde mental" from={48} to={74} />
          <ImprovementRow subject="Ética profissional" from={62} to={80} />
        </div>
      </div>

      {/* Sticky CTAs */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-2">
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <RocketLaunchIcon className="w-4 h-4" />
          Criar novo treino
        </button>
        <button
          type="button"
          className="w-full h-10 text-slate-600 text-xs font-semibold"
        >
          Ver detalhes do treino
        </button>
      </div>
    </div>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-center">
      <p className="text-sm font-bold text-slate-800 tabular-nums">{value}</p>
      <p className="text-[0.55rem] text-slate-500 leading-tight mt-0.5">
        {label}
      </p>
    </div>
  )
}

function ImprovementRow({
  subject,
  from,
  to,
}: {
  subject: string
  from: number
  to: number
}) {
  const gain = to - from
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-2.5 flex items-center gap-2">
      <p className="flex-1 text-[0.72rem] font-medium text-slate-700 truncate">
        {subject}
      </p>
      <span className="text-[0.65rem] text-slate-400 tabular-nums">
        {from}%
      </span>
      <ArrowRightIcon className="w-2.5 h-2.5 text-slate-300" />
      <span className="text-[0.72rem] font-bold text-emerald-700 tabular-nums">
        {to}%
      </span>
      <span className="text-[0.55rem] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
        +{gain}
      </span>
    </div>
  )
}
