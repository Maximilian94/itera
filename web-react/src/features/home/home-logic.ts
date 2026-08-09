import dayjs from 'dayjs'
import type { UserGoal } from '@/features/goal/domain/goal.types'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'

/** Meta anotada com sua sessão de treino ativa (join client-side por examBaseId). */
export interface GoalWithTraining {
  goal: UserGoal
  /** Sessão em andamento (stage != FINAL) mais recente numa prova do cargo. */
  training: TrainingListItem | null
  /** Última atividade (treino ou criação da meta) — ordena o herói. */
  lastTouch: number
}

/**
 * Junta metas e sessões de treino e elege o herói: a meta mexida mais
 * recentemente (treino ativo conta mais que meta parada).
 */
export function joinGoalsWithTrainings(
  goals: UserGoal[],
  trainings: TrainingListItem[],
): { hero: GoalWithTraining | null; others: GoalWithTraining[] } {
  const active = trainings.filter((t) => t.currentStage !== 'FINAL')
  const joined = goals.map((goal): GoalWithTraining => {
    const provaIds = new Set(goal.provaExamBaseIds)
    const training =
      active
        .filter((t) => provaIds.has(t.examBaseId))
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0] ?? null
    return {
      goal,
      training,
      lastTouch: training
        ? new Date(training.updatedAt).getTime()
        : new Date(goal.createdAt).getTime(),
    }
  })
  // Treino ativo vence meta parada; empate resolve por atividade recente.
  joined.sort((a, b) => {
    const aActive = a.training ? 1 : 0
    const bActive = b.training ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return b.lastTouch - a.lastTouch
  })
  return { hero: joined[0] ?? null, others: joined.slice(1) }
}

/** Dias de calendário até a data (0 = hoje, negativo = passou, null sem data). */
export function daysUntil(dateIso: string | null, now = new Date()): number | null {
  if (!dateIso) return null
  return dayjs(dateIso).startOf('day').diff(dayjs(now).startOf('day'), 'day')
}

export interface WeekActivity {
  /** Segunda→domingo da semana corrente. */
  days: Array<{ label: string; done: boolean; isToday: boolean }>
  sessionsThisWeek: number
  /** Média de dias com atividade por semana nas últimas 4 semanas (0 se nada). */
  weeklyRhythm: number
}

const DAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

/**
 * "Sua semana": um dia conta como sessão quando teve QUALQUER atividade —
 * tentativa iniciada/finalizada ou progresso de treino (updatedAt).
 */
export function weekActivity(
  attempts: ExamBaseAttemptHistoryItem[],
  trainings: TrainingListItem[],
  now = new Date(),
): WeekActivity {
  const stamps: string[] = []
  for (const a of attempts) {
    stamps.push(a.startedAt)
    if (a.finishedAt) stamps.push(a.finishedAt)
  }
  for (const t of trainings) stamps.push(t.updatedAt)
  const activeDays = new Set(stamps.map((s) => dayjs(s).format('YYYY-MM-DD')))

  const today = dayjs(now).startOf('day')
  const monday = today.subtract((today.day() + 6) % 7, 'day')
  const days = DAY_LABELS.map((label, i) => {
    const d = monday.add(i, 'day')
    return {
      label,
      done: activeDays.has(d.format('YYYY-MM-DD')),
      isToday: d.isSame(today, 'day'),
    }
  })
  const sessionsThisWeek = days.filter((d) => d.done).length

  const fourWeeksAgo = monday.subtract(28, 'day')
  let recentDays = 0
  for (const key of activeDays) {
    const d = dayjs(key)
    if (!d.isBefore(fourWeeksAgo) && d.isBefore(monday)) recentDays++
  }
  return {
    days,
    sessionsThisWeek,
    weeklyRhythm: Math.round(recentDays / 4),
  }
}

/** Type alias (não interface): ganha index signature implícita p/ o dataset do MUI LineChart. */
export type ScorePoint = {
  date: Date
  score: number
}

/** Tentativas finalizadas → série ordenada de notas (base dos gráficos). */
export function toScoreHistory(
  attempts: ExamBaseAttemptHistoryItem[],
): ScorePoint[] {
  return attempts
    .filter((i) => i.finishedAt != null && i.percentage != null)
    .map((i) => ({ date: dayjs(i.finishedAt!).toDate(), score: i.percentage! }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export interface EvolutionSummary {
  /** Média deste mês − média do mês anterior (p.p.); null sem os dois meses. */
  monthDelta: number | null
  latestScore: number | null
  /** Últimas 10 notas para o sparkline. */
  spark: number[]
}

export function evolutionSummary(
  history: ScorePoint[],
  now = new Date(),
): EvolutionSummary {
  const nowD = dayjs(now)
  const lastMonth = nowD.subtract(1, 'month')
  const inMonth = (d: Date, m: dayjs.Dayjs) => dayjs(d).isSame(m, 'month')
  const avg = (points: ScorePoint[]) =>
    points.length
      ? points.reduce((s, p) => s + p.score, 0) / points.length
      : null
  const avgThis = avg(history.filter((p) => inMonth(p.date, nowD)))
  const avgLast = avg(history.filter((p) => inMonth(p.date, lastMonth)))
  return {
    monthDelta: avgThis != null && avgLast != null ? avgThis - avgLast : null,
    latestScore: history.length ? history[history.length - 1].score : null,
    spark: history.slice(-10).map((p) => p.score),
  }
}

/** Inclinação da regressão linear (p.p. por prova) — usado na página /evolucao. */
export function linearRegressionSlope(scores: number[]): number | null {
  const n = scores.length
  if (n < 2) return null
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += scores[i]
    sumXY += i * scores[i]
    sumX2 += i * i
  }
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  return (n * sumXY - sumX * sumY) / denom
}

/** Iniciais da instituição para a marca do herói ("Prefeitura de Niterói" → "PN"). */
export function institutionMark(institution: string): string {
  const words = institution
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(das?|dos?|de|e)$/i.test(w))
  const initials = words.map((w) => w[0]!.toUpperCase()).join('')
  return (initials || institution.slice(0, 2).toUpperCase()).slice(0, 3)
}

/** Href da página do cargo de uma meta (slugs com fallback por UUID). */
export function goalHref(goal: UserGoal): {
  concursoSlug: string
  cargoSlug: string
} {
  return {
    concursoSlug: goal.concurso.slug ?? goal.concurso.id,
    cargoSlug: goal.cargo.slug ?? goal.oficialExamBaseId ?? goal.cargo.id,
  }
}
