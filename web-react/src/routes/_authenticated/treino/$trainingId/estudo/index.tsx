import { Card } from '@/components/Card'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
} from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getStagePath } from '../../-stages.config'
import {
  useTrainingStudyItemsQuery,
  useRetryQuestionsQuery,
  useUpdateTrainingStageMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'
import type { TrainingStudyItemResponse } from '@/features/training/domain/training.types'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/estudo/',
)({
  component: EstudoListPage,
})

/* ------------------------------------------------------------------ */
/*  Progress Ring                                                      */
/* ------------------------------------------------------------------ */

const RING_RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ProgressRing({
  percentage,
  animDelay = 0,
}: {
  percentage: number
  animDelay?: number
}) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRendered(true), animDelay + 100)
    return () => clearTimeout(t)
  }, [animDelay])

  const offset = CIRCUMFERENCE * (1 - (rendered ? percentage : 0) / 100)

  return (
    <div
      className="relative w-24 h-24 md:w-28 md:h-28"
      style={{ animation: `fade-in-up 0.6s ease-out ${animDelay}ms both` }}
    >
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl md:text-2xl font-bold text-white tabular-nums">
          {percentage}%
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Study Item Row                                                     */
/* ------------------------------------------------------------------ */

function StudyItemRow({
  trainingId,
  item,
  index,
}: {
  trainingId: string
  item: TrainingStudyItemResponse
  index: number
}) {
  const isPronto = Boolean(item.completedAt)

  return (
    <li
      style={{
        animation: `fade-in-up 0.4s ease-out ${300 + index * 50}ms both`,
      }}
    >
      <Link
        to="/treino/$trainingId/estudo/$studyItemId"
        params={{ trainingId, studyItemId: item.id }}
        className="flex items-center gap-4 no-underline text-inherit group"
      >
        <Card
          noElevation
          className={`w-full overflow-hidden transition-all duration-200 cursor-pointer ${
            isPronto
              ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-4 p-4">
            {isPronto ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors duration-200">
                <BookOpenIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors duration-200" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
                {item.recommendationTitle}
              </h4>
              {item.exercises.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.exercises.length}{' '}
                  {item.exercises.length === 1 ? 'exercício' : 'exercícios'}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                isPronto
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isPronto ? 'Concluído' : 'Pendente'}
            </span>
            <ChevronRightIcon className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
          </div>
        </Card>
      </Link>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function EstudoListPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: studyItems = [], isLoading } =
    useTrainingStudyItemsQuery(trainingId)
  const { data: retryQuestions = [] } = useRetryQuestionsQuery(trainingId)
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId)

  const total = studyItems.length
  const concluidos = studyItems.filter((i) => i.completedAt).length
  const pendentes = total - concluidos
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const temPendentes = pendentes > 0
  const totalRetryQuestions = retryQuestions.length

  const studyItemsBySubject = useMemo(() => {
    const bySubject = new Map<string, TrainingStudyItemResponse[]>()
    for (const item of studyItems) {
      const list = bySubject.get(item.subject) ?? []
      list.push(item)
      bySubject.set(item.subject, list)
    }
    return Array.from(bySubject.entries())
      .map(([subject, items]) => ({ subject, items }))
      .sort((a, b) => a.subject.localeCompare(b.subject))
  }, [studyItems])

  const handleIrParaRetentativa = () => {
    if (temPendentes) {
      setDialogOpen(true)
    } else {
      goToRetentativa()
    }
  }

  const goToRetentativa = async () => {
    setDialogOpen(false)
    try {
      await updateStageMutation.mutateAsync('RETRY')
      await queryClient.refetchQueries({
        queryKey: trainingKeys.one(trainingId),
      })
      navigate({ to: getStagePath('retentativa', trainingId) })
    } catch {
      // erro já tratado pela mutation
    }
  }

  /* ---- loading ---- */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-40 rounded-2xl bg-slate-200/60" />
        <div className="h-20 rounded-xl bg-slate-200/60" />
        <div className="h-60 rounded-xl bg-slate-200/60" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* ═══════════ HERO BANNER ═══════════ */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 md:px-8 bg-linear-to-br from-indigo-600 via-indigo-500 to-violet-500"
        style={{ animation: 'scale-in 0.45s ease-out both' }}
      >
        {/* decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Plano de Estudo
              </span>
            </div>
            <p className="text-white/70 text-sm max-w-md mb-4">
              Estude os temas em que você errou na prova diagnóstica. Quanto
              mais recomendações concluir, melhor será sua re-tentativa.
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {concluidos}/{total}
                </p>
                <p className="text-[0.65rem] text-white/60 font-medium uppercase tracking-wide">
                  Concluídos
                </p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {totalRetryQuestions}
                </p>
                <p className="text-[0.65rem] text-white/60 font-medium uppercase tracking-wide">
                  Questões na re-tentativa
                </p>
              </div>
            </div>
          </div>

          <ProgressRing percentage={progresso} animDelay={200} />
        </div>
      </div>

      {/* ═══════════ HOW IT WORKS (compact) ═══════════ */}
      <Card noElevation className="p-5 border border-slate-200 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <LightBulbIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-sm text-slate-600 leading-relaxed">
            <p>
              Clique em cada item para acessar a recomendação, a explicação
              detalhada e exercícios. Marque como concluído ao terminar. Você{' '}
              <strong>não precisa</strong> finalizar tudo antes de ir para a
              re-tentativa, mas estudar os pontos fracos melhora seu desempenho.
            </p>
          </div>
        </div>
      </Card>

      {/* ═══════════ PROGRESS BAR ═══════════ */}
      <div
        className="flex items-center gap-4"
        style={{ animation: 'fade-in-up 0.4s ease-out 200ms both' }}
      >
        <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-600 tabular-nums w-10 text-right">
          {progresso}%
        </span>
      </div>

      {/* ═══════════ STUDY ITEMS BY SUBJECT ═══════════ */}
      {studyItemsBySubject.length > 0 ? (
        <div className="flex flex-col gap-6">
          {studyItemsBySubject.map(({ subject, items }) => {
            const completed = items.filter((i) => i.completedAt).length
            const allDone = completed === items.length

            return (
              <div key={subject}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {subject}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {completed}/{items.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2 list-none p-0 m-0">
                  {items.map((item, idx) => (
                    <StudyItemRow
                      key={item.id}
                      trainingId={trainingId}
                      item={item}
                      index={idx}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : (
        <Card noElevation className="p-8 border-dashed border-2 border-slate-300 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <BookOpenIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">
              Nenhum item de estudo ainda. Avance para o diagnóstico e conclua a
              prova para gerar as recomendações.
            </p>
          </div>
        </Card>
      )}

      {/* ═══════════ CTA TO RETRY ═══════════ */}
      <Card
        noElevation
        className="p-5 border border-indigo-200 bg-indigo-50/50"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
            <RocketLaunchIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Pronto para a re-tentativa?
            </p>
            <p className="text-sm text-slate-600">
              Você pode avançar a qualquer momento, mesmo sem concluir tudo. O
              progresso fica salvo.
            </p>
          </div>
        </div>
      </Card>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <div className="flex flex-wrap gap-3 justify-between pt-2">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() =>
            navigate({ to: getStagePath('diagnostico', trainingId) })
          }
        >
          Diagnóstico
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          endIcon={
            updateStageMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )
          }
          onClick={handleIrParaRetentativa}
          disabled={updateStageMutation.isPending}
        >
          {updateStageMutation.isPending ? 'Avançando...' : 'Re-tentativa'}
        </Button>
      </div>

      {/* ═══════════ DIALOG ═══════════ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ir para Re-tentativa?</DialogTitle>
        <DialogContent>
          <p className="text-slate-700 mb-2">
            Você ainda tem{' '}
            <strong>
              {pendentes}{' '}
              {pendentes === 1 ? 'recomendação' : 'recomendações'}
            </strong>{' '}
            de estudo não concluídas.
          </p>
          <p className="text-slate-600 text-sm mb-2">
            Não é obrigatório terminar todas antes de seguir — você pode ir para
            a Re-tentativa agora e testar o que já estudou. Porém, concluir as
            recomendações pendentes costuma melhorar seu desempenho.
          </p>
          <p className="text-slate-600 text-sm">
            Se preferir, pode continuar estudando e marcar como &quot;pronto&quot;
            quando terminar. Você também pode voltar a esta etapa depois.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Continuar no estudo
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={goToRetentativa}
            disabled={updateStageMutation.isPending}
          >
            {updateStageMutation.isPending
              ? 'Avançando...'
              : 'Ir para Re-tentativa'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
