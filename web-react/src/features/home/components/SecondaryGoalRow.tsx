import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { ReadinessBar } from '@/features/concurso/components/ReadinessBar'
import { useMeters } from '@/features/concurso/components/motion'
import {
  TRAINING_STAGE_TO_SLUG,
  getStageBySlug,
} from '@/features/training/domain/stages.config'
import type { GoalWithTraining } from '../home-logic'
import { daysUntil, goalHref, institutionMark } from '../home-logic'

/**
 * Linha compacta de uma meta que não é o herói ("Você também está treinando
 * para"): identidade + mini prontidão + CTA. Um clique leva à página do cargo.
 */
export function SecondaryGoalRow({ item }: { item: GoalWithTraining }) {
  const { goal, training } = item
  const meters = useMeters()
  const params = goalHref(goal)
  const days = daysUntil(goal.examDate)
  const best = goal.stats.bestScore
  const cut = goal.cargo.minPassingGrade
  const stage = training
    ? getStageBySlug(TRAINING_STAGE_TO_SLUG[training.currentStage])
    : null

  const subParts = [
    goal.examDate
      ? `Prova em ${dayjs(goal.examDate).format('DD/MM/YYYY')}`
      : 'Data da prova a definir',
    days != null && days > 0 ? `faltam ${days} dias` : null,
    stage ? `fase de ${stage.title}` : null,
  ].filter(Boolean)

  return (
    <Link
      to="/concursos/$concursoSlug/$cargoSlug"
      params={params}
      className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-inherit no-underline shadow-sm transition-shadow hover:shadow-md"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-xs font-extrabold text-cyan-700"
      >
        {institutionMark(goal.concurso.institution)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">
          {goal.cargo.role} — {goal.concurso.institution}
        </span>
        <span className="block text-xs text-slate-500">
          {subParts.join(' · ')}
        </span>
      </span>
      <span className="w-44 shrink-0 max-sm:order-4 max-sm:w-full">
        <span className="flex justify-between text-[11px] text-slate-500">
          <span>
            Prontidão{' '}
            <strong className="text-slate-900">
              {best != null ? `${Math.round(best)}%` : '—'}
            </strong>
          </span>
          {cut != null && <span>corte {Math.round(cut)}</span>}
        </span>
        <ReadinessBar
          value={best != null ? Math.round(best) : 0}
          cut={cut}
          meters={meters}
          size="sm"
          className="mt-1"
        />
      </span>
      <span className="inline-flex shrink-0 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-cyan-700 max-sm:ml-auto">
        {training ? 'Continuar' : 'Treinar'}
      </span>
    </Link>
  )
}
