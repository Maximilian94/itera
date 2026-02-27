import { AccessGate } from '@/components/AccessGate'
import { Card } from '@/components/Card'
import { PageHero } from '@/components/PageHero'
import { StartExamDialog } from '@/components/StartExamDialog'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useQuestionsCountBySubjectQuery } from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { authService } from '@/features/auth/services/auth.service'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, CircularProgress, Tooltip } from '@mui/material'
import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckIcon,
  DocumentTextIcon,
  EyeSlashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CalendarDaysIcon } from '@heroicons/react/24/solid'
import { getStagePath } from './-stages.config'
import { formatBRL, formatExamBaseTitle } from '@/lib/utils'
import dayjs from 'dayjs'

export const Route = createFileRoute('/_authenticated/treino/novo')({
  /** Training creation page. Requires plan with trainings (Estratégico/Elite). */
  component: () => (
    <AccessGate type="treino">
      <NovoPage />
    </AccessGate>
  ),
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
/*  Selectable Exam Card                                               */
/* ------------------------------------------------------------------ */

function SelectableExamCard({
  exam,
  selected,
  onSelect,
  isAdmin,
  animDelay = 0,
}: {
  exam: ExamBase
  selected: boolean
  onSelect: () => void
  isAdmin?: boolean
  animDelay?: number
}) {
  const questionCount = exam._count?.questions ?? 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full text-left cursor-pointer"
    >
      <Card
        noElevation
        className={`p-0 border-2 transition-all duration-200 overflow-hidden h-full ${
          selected
            ? 'border-emerald-400 bg-emerald-50/40 shadow-sm shadow-emerald-100'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <div
          style={{
            animation: `fade-in-up 0.4s ease-out ${animDelay}ms both`,
          }}
        >
          {/* Selected indicator */}
          <div
            className={`h-1 transition-all duration-200 ${
              selected
                ? 'bg-emerald-500'
                : 'bg-transparent'
            }`}
          />

          <div className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {exam.examBoard?.logoUrl && (
                  <Tooltip title={exam.examBoard.name ?? ''}>
                    <img
                      src={exam.examBoard.logoUrl}
                      alt={exam.examBoard.alias ?? exam.examBoard.name ?? ''}
                      className="w-9 h-9 object-contain rounded-lg shrink-0"
                    />
                  </Tooltip>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {formatExamBaseTitle(exam)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {exam.role}
                  </p>
                </div>
              </div>

              {/* Check icon */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                  selected
                    ? 'bg-emerald-500 text-white'
                    : 'border-2 border-slate-200'
                }`}
              >
                {selected && <CheckIcon className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Info pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {isAdmin && !(exam.published ?? true) && (
                <span
                  className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                  title="Este exame não está publicado. Usuários não podem vê-lo."
                >
                  <EyeSlashIcon className="w-3 h-3" />
                  Não publicado
                </span>
              )}
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
            <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
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
          </div>
        </div>
      </Card>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Board Filter Pill                                                  */
/* ------------------------------------------------------------------ */

function BoardPill({
  board,
  count,
  isActive,
  onClick,
}: {
  board: { id: string; name: string; alias?: string | null; logoUrl: string }
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Tooltip title={board.name}>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-200 text-left shrink-0 cursor-pointer ${
          isActive
            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <img
          src={board.logoUrl}
          alt={board.alias ?? board.name}
          className="w-7 h-7 object-contain rounded"
        />
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold truncate ${
              isActive ? 'text-emerald-800' : 'text-slate-700'
            }`}
          >
            {board.alias ?? board.name}
          </p>
        <p className="text-[0.65rem] text-slate-400">
          {count} {count === 1 ? 'prova' : 'provas'}
        </p>
      </div>
    </button>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function NovoPage() {
  const navigate = useNavigate()
  const [selectedExamBaseId, setSelectedExamBaseId] = useState<string | null>(
    null,
  )
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)

  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const { examBoards } = useExamBoardFacade()
  const createMutation = useCreateTrainingMutation()
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })
  const isAdmin = profileData?.user?.role === 'ADMIN'

  const selectedExam = (examBases ?? []).find(
    (e) => e.id === selectedExamBaseId,
  )
  const { data: subjectStats = [], isLoading: isLoadingSubjectStats } =
    useQuestionsCountBySubjectQuery(selectedExamBaseId ?? undefined)

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
          (e.examBoard?.name ?? '').toLowerCase().includes(q) ||
          (e.examBoard?.alias ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [examBases, selectedBoardId, search])

  const handleOpenCreate = () => {
    if (!selectedExamBaseId) return
    setStartDialogOpen(true)
  }

  const handleCreateAndContinue = (subjectFilter: string[]) => {
    if (!selectedExamBaseId) return
    createMutation.mutate(
      { examBaseId: selectedExamBaseId, subjectFilter },
      {
        onSuccess: (res) => {
          setStartDialogOpen(false)
          navigate({ to: getStagePath('prova', res.trainingId) })
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* ═══════════ HERO ═══════════ */}
      <PageHero
        title="Novo treino"
        description="Escolha um concurso para começar. Você vai fazer a prova, receber diagnóstico da IA, estudar e refazer as questões que errou."
        variant="emerald"
        animation="scale-in 0.45s ease-out both"
        rounded="rounded-2xl"
        padding="px-6 py-8 md:px-8 md:py-10"
      />

      {/* ═══════════ SEARCH & FILTERS ═══════════ */}
      <div className="flex flex-col gap-3">
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
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
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

        {/* Board filter pills */}
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
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
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
        <h2 className="text-sm font-semibold text-slate-800">
          {selectedBoardId || search
            ? `${filteredExams.length} resultado${filteredExams.length !== 1 ? 's' : ''}`
            : 'Escolha um concurso'}
        </h2>
        {selectedExam && (
          <span className="text-xs text-emerald-600 font-medium">
            1 selecionado
          </span>
        )}
      </div>

      {/* ═══════════ EXAM GRID ═══════════ */}
      {isLoadingExamBases ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-200/60" />
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
                Nenhum concurso encontrado
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {search
                  ? `Nenhum resultado para "${search}". Tente outro termo.`
                  : 'Não há concursos disponíveis no momento.'}
              </p>
            </div>
            {(search || selectedBoardId) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedBoardId(null)
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExams.map((exam, idx) => (
            <SelectableExamCard
              key={exam.id}
              exam={exam}
              selected={selectedExamBaseId === exam.id}
              onSelect={() =>
                setSelectedExamBaseId(
                  selectedExamBaseId === exam.id ? null : exam.id,
                )
              }
              isAdmin={isAdmin}
              animDelay={250 + idx * 30}
            />
          ))}
        </div>
      )}

      {/* ═══════════ STICKY FOOTER ═══════════ */}
      <div className="sticky bottom-0 -mx-1 px-1 pt-4 pb-2 bg-linear-to-t from-white via-white to-white/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon className="w-5 h-5" />}
            component={Link}
            to="/treino"
          >
            Voltar
          </Button>

          <div className="flex items-center gap-3">
            {selectedExam && (
              <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[200px]">
                {formatExamBaseTitle(selectedExam)}
              </span>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={
                createMutation.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <RocketLaunchIcon className="w-5 h-5" />
                )
              }
              onClick={handleOpenCreate}
              disabled={!selectedExamBaseId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar e avançar'}
            </Button>
          </div>
        </div>
      </div>

      <StartExamDialog
        open={startDialogOpen}
        onClose={() => setStartDialogOpen(false)}
        onConfirm={handleCreateAndContinue}
        subjectStats={subjectStats}
        isLoading={isLoadingSubjectStats}
        isSubmitting={createMutation.isPending}
        title="Como deseja fazer o treino?"
        confirmLabel="Criar e avançar"
      />
    </div>
  )
}
