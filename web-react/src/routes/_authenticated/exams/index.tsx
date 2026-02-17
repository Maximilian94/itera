import { Card } from '@/components/Card'
import { PageHero } from '@/components/PageHero'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import { createFileRoute, Link } from '@tanstack/react-router'
import { formatBRL } from '@/lib/utils'
import dayjs from 'dayjs'
import { useState, useMemo } from 'react'
import {
  ArrowRightIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TrophyIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { CalendarDaysIcon } from '@heroicons/react/24/solid'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Tooltip } from '@mui/material'
import { PpTooltip } from '@/components/PpTooltip'

export const Route = createFileRoute('/_authenticated/exams/')({
  component: ExamsPage,
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function governmentScopeLabel(scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') {
  if (scope === 'MUNICIPAL') return 'Municipal'
  if (scope === 'STATE') return 'Estadual'
  return 'Federal'
}

function governmentScopeColor(scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') {
  if (scope === 'MUNICIPAL') return 'bg-blue-50 text-blue-700'
  if (scope === 'STATE') return 'bg-violet-50 text-violet-700'
  return 'bg-amber-50 text-amber-700'
}

/* ------------------------------------------------------------------ */
/*  Exam Board Pill                                                    */
/* ------------------------------------------------------------------ */

function BoardPill({
  board,
  count,
  isActive,
  onClick,
}: {
  board: { id: string; name: string; logoUrl: string }
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-200 text-left shrink-0 cursor-pointer ${
        isActive
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <img
        src={board.logoUrl}
        alt={board.name}
        className="w-7 h-7 object-contain rounded"
      />
      <div className="min-w-0">
        <p
          className={`text-xs font-semibold truncate ${
            isActive ? 'text-blue-800' : 'text-slate-700'
          }`}
        >
          {board.name}
        </p>
        <p className="text-[0.65rem] text-slate-400">
          {count} {count === 1 ? 'prova' : 'provas'}
        </p>
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Exam Base Card                                                     */
/* ------------------------------------------------------------------ */

function ExamCard({
  exam,
  animDelay = 0,
}: {
  exam: ExamBase
  animDelay?: number
}) {
  const questionCount = exam._count?.questions ?? 0
  const hasAttempts = (exam.userStats?.attemptCount ?? 0) > 0
  const canNavigate = Boolean(exam.examBoardId)

  const content = (
    <Card
      noElevation
      className="p-0 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group overflow-hidden h-full"
    >
      <div
        style={{
          animation: `fade-in-up 0.45s ease-out ${animDelay}ms both`,
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 bg-linear-to-r from-blue-400 via-violet-400 to-emerald-400 opacity-60" />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {exam.examBoard?.logoUrl && (
                <img
                  src={exam.examBoard.logoUrl}
                  alt={exam.examBoard.name ?? ''}
                  className="w-9 h-9 object-contain rounded-lg shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {exam.institution ?? exam.name}
                </p>
                <p className="text-xs text-slate-500 truncate">{exam.role}</p>
              </div>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span
              className={`inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${governmentScopeColor(exam.governmentScope)}`}
            >
              <BuildingLibraryIcon className="w-3 h-3" />
              {governmentScopeLabel(exam.governmentScope)}
            </span>
            {(exam.state || exam.city) && (
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <MapPinIcon className="w-3 h-3" />
                {exam.city ? `${exam.city} / ` : ''}
                {exam.state ?? ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              <CalendarDaysIcon className="w-3 h-3" />
              {dayjs(exam.examDate).format('MMM/YYYY')}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <Tooltip title="Questões">
                <div className="flex items-center gap-1.5">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 tabular-nums">
                    {questionCount} questões
                  </span>
                </div>
              </Tooltip>
              {exam.salaryBase && (
                <Tooltip title="Salário base">
                  <div className="flex items-center gap-1.5">
                    <BanknotesIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {formatBRL(exam.salaryBase)}
                    </span>
                  </div>
                </Tooltip>
              )}
            </div>

            {hasAttempts && (
              <div className="flex items-center gap-3">
                <Tooltip title="Melhor nota">
                  <div className="flex items-center gap-1">
                    <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 tabular-nums">
                      {exam.userStats?.bestScore != null
                        ? `${exam.userStats.bestScore.toFixed(0)}%`
                        : '—'}
                    </span>
                  </div>
                </Tooltip>
                <Tooltip title="Tentativas">
                  <div className="flex items-center gap-1">
                    <ArrowPathIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 tabular-nums">
                      {exam.userStats!.attemptCount}x
                    </span>
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )

  if (canNavigate) {
    return (
      <Link
        to="/exams/$examBoard/$examId"
        params={{ examBoard: exam.examBoardId!, examId: exam.id }}
        className="block no-underline text-inherit"
      >
        {content}
      </Link>
    )
  }
  return content
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function ExamsPage() {
  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade()
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()

  const [search, setSearch] = useState('')
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)

  // Board counts
  const boardCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const eb of examBases ?? []) {
      if (eb.examBoardId) {
        map.set(eb.examBoardId, (map.get(eb.examBoardId) ?? 0) + 1)
      }
    }
    return map
  }, [examBases])

  // Filtered exams
  const filteredExams = useMemo(() => {
    let list = examBases ?? []

    if (selectedBoardId) {
      list = list.filter((e) => e.examBoardId === selectedBoardId)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          (e.institution ?? '').toLowerCase().includes(q) ||
          (e.name ?? '').toLowerCase().includes(q) ||
          (e.role ?? '').toLowerCase().includes(q) ||
          (e.state ?? '').toLowerCase().includes(q) ||
          (e.city ?? '').toLowerCase().includes(q) ||
          (e.examBoard?.name ?? '').toLowerCase().includes(q),
      )
    }

    return list
  }, [examBases, selectedBoardId, search])

  // Stats
  const totalExams = (examBases ?? []).length
  const totalQuestions = (examBases ?? []).reduce(
    (acc, e) => acc + (e._count?.questions ?? 0),
    0,
  )
  const examsWithAttempts = (examBases ?? []).filter(
    (e) => (e.userStats?.attemptCount ?? 0) > 0,
  ).length

  const totalAttempts = historyItems.length
  const passedAttempts = historyItems.filter((i) => i.passed === true).length
  const failedAttempts = historyItems.filter(
    (i) => i.finishedAt != null && i.passed !== true,
  ).length

  // Taxa de aprovação e evolução
  const { approvalRate, evolutionPp } = useMemo(() => {
    const finished = historyItems
      .filter((i) => i.finishedAt != null)
      .sort(
        (a, b) =>
          new Date(b.finishedAt!).getTime() -
          new Date(a.finishedAt!).getTime(),
      )
    const total = finished.length
    const passed = finished.filter((i) => i.passed === true).length
    const rate = total > 0 ? (passed / total) * 100 : null

    let evolution: number | null = null
    if (total >= 4) {
      const half = Math.floor(total / 2)
      const recent = finished.slice(0, half)
      const older = finished.slice(half)
      const recentRate =
        recent.length > 0
          ? (recent.filter((i) => i.passed === true).length / recent.length) *
            100
          : 0
      const olderRate =
        older.length > 0
          ? (older.filter((i) => i.passed === true).length / older.length) *
            100
          : 0
      evolution = recentRate - olderRate
    }

    return {
      approvalRate: rate,
      evolutionPp: evolution,
    }
  }, [historyItems])

  const isLoading = isLoadingExamBases || isLoadingExamBoards

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* ═══════════ HERO ═══════════ */}
      <PageHero
        title="Exames"
        description="Explore simulados de concursos, pratique e acompanhe sua evolução."
        variant="violet"
        animation="scale-in 0.45s ease-out both"
        // padding="px-6 py-8 md:px-8 md:py-10"
      >
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : totalExams}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Provas
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading
                ? '—'
                : totalQuestions > 999
                  ? `${(totalQuestions / 1000).toFixed(1)}k`
                  : totalQuestions}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Questões
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">
              {isLoading ? '—' : examsWithAttempts}
            </p>
            <p className="text-[0.65rem] text-violet-200/70 font-medium uppercase tracking-wide">
              Praticados
            </p>
          </div>
        </div>
      </PageHero>

      {/* ═══════════ RESUMO DE TENTATIVAS + TAXA DE APROVAÇÃO ═══════════ */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ animation: 'fade-in-up 0.5s ease-out 80ms both' }}
      >
        <Card noElevation className="p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Suas tentativas
            </h3>
            <Link
              to="/history"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium no-underline"
            >
              Ver histórico
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100">
                <DocumentTextIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {loadingHistory ? '—' : totalAttempts}
                </p>
                <p className="text-xs text-slate-500">Tentativas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-emerald-700">
                  {loadingHistory ? '—' : passedAttempts}
                </p>
                <p className="text-xs text-slate-500">Aprovados</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-100">
                <XCircleIcon className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-red-600">
                  {loadingHistory ? '—' : failedAttempts}
                </p>
                <p className="text-xs text-slate-500">Reprovados</p>
              </div>
            </div>
          </div>
        </Card>

        <Card noElevation className="p-5 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Taxa de aprovação
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-100">
                <TrophyIcon className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {loadingHistory
                    ? '—'
                    : approvalRate != null
                      ? `${approvalRate.toFixed(0)}%`
                      : '—'}
                </p>
                <p className="text-xs text-slate-500">Atual</p>
              </div>
            </div>
            {evolutionPp != null && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  evolutionPp > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : evolutionPp < 0
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evolutionPp > 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : evolutionPp < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                ) : (
                  <MinusIcon className="w-4 h-4" />
                )}
                <span>
                  {evolutionPp > 0 ? '+' : ''}
                  {evolutionPp.toFixed(0)}{' '}
                  <PpTooltip className="text-inherit" />
                </span>
              </div>
            )}
          </div>
          {evolutionPp == null && !loadingHistory && (
            <p className="text-xs text-slate-500 mt-2">
              Complete pelo menos 4 tentativas para ver a evolução.
            </p>
          )}
        </Card>
      </div>

      {/* ═══════════ SEARCH & FILTERS ═══════════ */}
      <div className="flex flex-col gap-4">
        {/* Search bar */}
        <div
          className="relative"
          style={{ animation: 'fade-in-up 0.5s ease-out 100ms both' }}
        >
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por instituição, cargo, banca, estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Exam board filter pills */}
        {(examBoards ?? []).length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1"
            style={{ animation: 'fade-in-up 0.5s ease-out 150ms both' }}
          >
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0 mr-1">
              <FunnelIcon className="w-3.5 h-3.5" />
              <span className="text-[0.65rem] font-medium uppercase tracking-wide">
                Banca
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBoardId(null)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedBoardId === null
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              Todas
            </button>

            {(examBoards ?? []).map((board) => {
              const count = boardCounts.get(board.id) ?? 0
              if (count === 0) return null
              return (
                <BoardPill
                  key={board.id}
                  board={board}
                  count={count}
                  isActive={selectedBoardId === board.id}
                  onClick={() =>
                    setSelectedBoardId(
                      selectedBoardId === board.id ? null : board.id,
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════════ RESULTS HEADER ═══════════ */}
      <div
        className="flex items-center justify-between"
        style={{ animation: 'fade-in-up 0.5s ease-out 200ms both' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            {selectedBoardId || search
              ? `${filteredExams.length} resultado${filteredExams.length !== 1 ? 's' : ''}`
              : 'Todas as provas'}
          </h2>
          {selectedBoardId && (
            <button
              type="button"
              onClick={() => setSelectedBoardId(null)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Limpar filtro
            </button>
          )}
        </div>
        {!isLoading && (
          <span className="text-xs text-slate-400">
            {totalExams} {totalExams === 1 ? 'prova' : 'provas'} no total
          </span>
        )}
      </div>

      {/* ═══════════ EXAM GRID ═══════════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-200/60" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card noElevation className="p-10 border border-slate-200 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Nenhuma prova encontrada
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {search
                  ? `Nenhum resultado para "${search}". Tente outro termo.`
                  : 'Não há provas disponíveis no momento.'}
              </p>
            </div>
            {(search || selectedBoardId) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedBoardId(null)
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam, idx) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              animDelay={250 + idx * 40}
            />
          ))}
        </div>
      )}
    </div>
  )
}
