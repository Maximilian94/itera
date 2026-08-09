import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { IconButton, Menu, MenuItem } from '@mui/material'
import {
  ArrowRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { ReadinessBar } from '@/features/concurso/components/ReadinessBar'
import { useMeters } from '@/features/concurso/components/motion'
import {
  TRAINING_STAGE_TO_SLUG,
  getStageBySlug,
} from '@/features/training/domain/stages.config'
import { useArchiveGoalMutation } from '@/features/goal/queries/goal.queries'
import type { GoalWithTraining } from '../home-logic'
import { daysUntil, goalHref, institutionMark } from '../home-logic'

/** Linha discreta da cota dentro do herói (era um card inteiro na home antiga). */
export interface QuotaInfo {
  active: boolean
  used: number
  limit: number
}

/**
 * Herói "Sua meta": o cargo-alvo com countdown, prontidão vs corte e a faixa
 * de retomada ("onde você parou" ou "faça o diagnóstico"). CTA primário único.
 */
export function GoalHero({
  item,
  quota,
  blockedMessage,
  upgradeCta,
}: {
  item: GoalWithTraining
  quota: QuotaInfo
  /** Quando não há treino ativo e a cota barra começar um novo. */
  blockedMessage: string | null
  /** Substitui o CTA por upgrade quando o limite do mês foi atingido. */
  upgradeCta?: { label: string; onClick: () => void; disabled: boolean } | null
}) {
  const { goal, training } = item
  const meters = useMeters()
  const navigate = useNavigate()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const archiveGoal = useArchiveGoalMutation()

  const params = goalHref(goal)
  const days = daysUntil(goal.examDate)
  const best = goal.stats.bestScore
  const cut = goal.cargo.minPassingGrade
  const stage = training
    ? getStageBySlug(TRAINING_STAGE_TO_SLUG[training.currentStage])
    : null

  const deltaToCut =
    best != null && cut != null ? Math.round(best - cut) : null

  return (
    <section
      aria-labelledby="goal-hero-title"
      className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-sm font-extrabold text-cyan-700"
          >
            {institutionMark(goal.concurso.institution)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sua meta
            </p>
            <h2
              id="goal-hero-title"
              className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
            >
              {goal.cargo.role} — {goal.concurso.institution}
            </h2>
            <p className="text-xs text-slate-500">
              {goal.concurso.year}
              {goal.examDate
                ? ` · Prova em ${dayjs(goal.examDate).format('DD/MM/YYYY')}`
                : ' · Data da prova a definir'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-1">
          {days != null && days >= 0 && (
            <div className="text-right">
              <p className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                {days === 0 ? 'É hoje' : `${days} dia${days === 1 ? '' : 's'}`}
              </p>
              {days > 0 && <p className="text-xs text-slate-500">até a prova</p>}
            </div>
          )}
          <IconButton
            size="small"
            aria-label="Opções da meta"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <EllipsisVerticalIcon className="h-5 w-5 text-slate-500" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={menuAnchor != null}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                navigate({
                  to: '/concursos/$concursoSlug/$cargoSlug',
                  params,
                })
              }}
            >
              Ver página do cargo
            </MenuItem>
            <MenuItem
              disabled={archiveGoal.isPending}
              onClick={() => {
                setMenuAnchor(null)
                archiveGoal.mutate(goal.id)
              }}
            >
              Parar de treinar
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Prontidão vs corte */}
      <div className="px-5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            Prontidão para o corte
          </p>
          <p className="text-xs text-slate-500">
            {best == null ? (
              'Aparece depois da sua prova-diagnóstico'
            ) : deltaToCut != null ? (
              deltaToCut >= 0 ? (
                <>
                  Você está{' '}
                  <span className="font-semibold text-emerald-700">
                    {deltaToCut} p.p. acima
                  </span>{' '}
                  da nota de corte
                </>
              ) : (
                <>
                  Faltam{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.abs(deltaToCut)} p.p.
                  </span>{' '}
                  para a nota de corte
                </>
              )
            ) : (
              `Sua melhor nota: ${Math.round(best)}%`
            )}
          </p>
        </div>
        <ReadinessBar
          value={best != null ? Math.round(best) : 0}
          cut={cut}
          meters={meters}
          className="mt-2"
        />
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
          <span>0</span>
          <span>
            Prontidão:{' '}
            <strong className="text-slate-900">
              {best != null ? `${Math.round(best)}%` : '—'}
            </strong>
            {cut != null && ` · corte ${Math.round(cut)}`}
          </span>
          <span>100</span>
        </div>
      </div>

      {/* Onde você parou / primeiro passo + CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          {training && stage ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
                Fase de {stage.title}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {training.examTitle}
              </p>
              <p className="text-xs text-slate-500">
                Você parou aqui em {dayjs(training.updatedAt).format('DD/MM')} ·
                retome de onde estava
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
                Primeiro passo · Diagnóstico
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                Faça a prova-diagnóstico para medir onde você está
              </p>
              <p className="text-xs text-slate-500">
                {blockedMessage ?? 'Começar um treino usa 1 treino do seu mês'}
              </p>
            </>
          )}
        </div>
        {!training && upgradeCta ? (
          <button
            type="button"
            onClick={upgradeCta.onClick}
            disabled={upgradeCta.disabled}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 disabled:opacity-60 max-sm:w-full max-sm:justify-center"
          >
            {upgradeCta.label}
            <ArrowRightIcon aria-hidden className="h-4 w-4" />
          </button>
        ) : (
          <Link
            to="/concursos/$concursoSlug/$cargoSlug"
            params={params}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-colors hover:bg-cyan-700 max-sm:w-full max-sm:justify-center"
          >
            {training ? 'Continuar treino' : 'Começar treino'}
            <ArrowRightIcon aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Cota — linha discreta, não um card */}
      {quota.active && (
        <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500 sm:px-6">
          <span aria-hidden className="flex gap-1">
            {Array.from({ length: Math.min(quota.limit, 8) }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-3.5 rounded-full ${
                  i < quota.used ? 'bg-cyan-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </span>
          {`${quota.used} de ${quota.limit} treinos usados este mês · renova em ${dayjs()
            .add(1, 'month')
            .startOf('month')
            .format('DD/MM')}`}
        </div>
      )}
    </section>
  )
}
