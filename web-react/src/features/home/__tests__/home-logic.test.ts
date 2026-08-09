import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { UserGoal } from '@/features/goal/domain/goal.types'
import type { TrainingListItem } from '@/features/training/domain/training.types'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import {
  daysUntil,
  evolutionSummary,
  goalHref,
  institutionMark,
  joinGoalsWithTrainings,
  toScoreHistory,
  weekActivity,
} from '../home-logic'

function makeGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    id: 'g1',
    createdAt: '2026-08-01T12:00:00.000Z',
    concurso: {
      id: 'c1',
      slug: 'pref-niteroi-2026',
      institution: 'Prefeitura de Niterói',
      year: 2026,
    },
    cargo: { id: 'cg1', slug: 'enfermeiro', role: 'Enfermeiro', minPassingGrade: 60 },
    examDate: '2026-09-20T00:00:00.000Z',
    provaExamBaseIds: ['p1'],
    oficialExamBaseId: 'p1',
    stats: { attemptCount: 1, bestScore: 62 },
    ...overrides,
  }
}

function makeTraining(
  overrides: Partial<TrainingListItem> = {},
): TrainingListItem {
  return {
    trainingId: 't1',
    examBaseId: 'p1',
    examBoardId: 'b1',
    examTitle: 'Prova Enfermeiro',
    cargoSlug: 'enfermeiro',
    cargoLabel: 'Enfermeiro',
    concursoSlug: 'pref-niteroi-2026',
    concursoTitle: 'Prefeitura de Niterói 2026',
    currentStage: 'STUDY',
    attemptId: 'a1',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-08-07T12:00:00.000Z',
    attemptFinishedAt: null,
    minPassingGrade: 60,
    initialScorePercentage: 55,
    finalScorePercentage: null,
    ...overrides,
  }
}

describe('joinGoalsWithTrainings', () => {
  it('elege como herói a meta com treino ativo mais recente', () => {
    const goalA = makeGoal({ id: 'gA', provaExamBaseIds: ['p1'] })
    const goalB = makeGoal({
      id: 'gB',
      provaExamBaseIds: ['p2'],
      createdAt: '2026-08-08T12:00:00.000Z',
    })
    const training = makeTraining({ examBaseId: 'p1' })
    const { hero, others } = joinGoalsWithTrainings(
      [goalB, goalA],
      [training],
    )
    // goalB é mais nova, mas goalA tem treino ativo → herói.
    expect(hero?.goal.id).toBe('gA')
    expect(hero?.training?.trainingId).toBe('t1')
    expect(others.map((o) => o.goal.id)).toEqual(['gB'])
  })

  it('treino FINAL não conta como ativo', () => {
    const goal = makeGoal()
    const { hero } = joinGoalsWithTrainings(
      [goal],
      [makeTraining({ currentStage: 'FINAL' })],
    )
    expect(hero?.training).toBeNull()
  })

  it('sem metas → hero null', () => {
    expect(joinGoalsWithTrainings([], [makeTraining()]).hero).toBeNull()
  })
})

describe('daysUntil', () => {
  const now = new Date('2026-08-08T15:00:00')
  it('conta dias de calendário', () => {
    expect(daysUntil('2026-08-10T00:00:00', now)).toBe(2)
    expect(daysUntil(dayjs(now).toISOString(), now)).toBe(0)
    expect(daysUntil('2026-08-01T00:00:00', now)).toBeLessThan(0)
    expect(daysUntil(null, now)).toBeNull()
  })
})

describe('weekActivity', () => {
  // Sábado 2026-08-08. Semana corrente: seg 03/08 → dom 09/08.
  const now = new Date('2026-08-08T15:00:00')

  it('marca os dias com atividade e conta sessões da semana', () => {
    const attempts = [
      { startedAt: '2026-08-03T10:00:00', finishedAt: '2026-08-03T11:00:00' },
      { startedAt: '2026-08-05T10:00:00', finishedAt: null },
    ] as ExamBaseAttemptHistoryItem[]
    const trainings = [makeTraining({ updatedAt: '2026-08-06T09:00:00' })]
    const week = weekActivity(attempts, trainings, now)
    expect(week.sessionsThisWeek).toBe(3)
    expect(week.days.map((d) => d.done)).toEqual([
      true, // seg 03
      false,
      true, // qua 05
      true, // qui 06 (treino)
      false,
      false, // sáb (hoje, sem sessão)
      false,
    ])
    expect(week.days[5].isToday).toBe(true)
  })

  it('ritmo = dias ativos nas 4 semanas anteriores / 4', () => {
    const attempts = Array.from({ length: 8 }, (_, i) => ({
      startedAt: dayjs('2026-08-02').subtract(i * 3, 'day').toISOString(),
      finishedAt: null,
    })) as ExamBaseAttemptHistoryItem[]
    const week = weekActivity(attempts, [], now)
    expect(week.weeklyRhythm).toBe(2)
  })
})

describe('evolutionSummary', () => {
  const now = new Date('2026-08-08T15:00:00')
  it('compara a média do mês com a do mês anterior', () => {
    const history = toScoreHistory([
      { finishedAt: '2026-07-10T10:00:00', percentage: 50 },
      { finishedAt: '2026-07-20T10:00:00', percentage: 60 },
      { finishedAt: '2026-08-05T10:00:00', percentage: 65 },
    ] as ExamBaseAttemptHistoryItem[])
    const summary = evolutionSummary(history, now)
    expect(summary.monthDelta).toBe(10) // 65 − (50+60)/2
    expect(summary.latestScore).toBe(65)
    expect(summary.spark).toEqual([50, 60, 65])
  })

  it('sem dois meses de dados → monthDelta null', () => {
    const history = toScoreHistory([
      { finishedAt: '2026-08-05T10:00:00', percentage: 65 },
    ] as ExamBaseAttemptHistoryItem[])
    expect(evolutionSummary(history, now).monthDelta).toBeNull()
  })
})

describe('institutionMark', () => {
  it('iniciais das palavras significativas', () => {
    expect(institutionMark('Prefeitura de Niterói')).toBe('PN')
    expect(institutionMark('EBSERH')).toBe('E')
    expect(institutionMark('Universidade Federal de São Paulo')).toBe('UFS')
  })
})

describe('goalHref', () => {
  it('usa slugs e cai no fallback por UUID', () => {
    expect(goalHref(makeGoal())).toEqual({
      concursoSlug: 'pref-niteroi-2026',
      cargoSlug: 'enfermeiro',
    })
    const noSlugs = makeGoal({
      concurso: { id: 'c1', slug: null, institution: 'X', year: 2026 },
      cargo: { id: 'cg1', slug: null, role: 'Enfermeiro', minPassingGrade: null },
    })
    expect(goalHref(noSlugs)).toEqual({
      concursoSlug: 'c1',
      cargoSlug: 'p1', // oficialExamBaseId
    })
  })
})
