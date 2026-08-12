import { beforeEach, describe, expect, it } from 'vitest'
import {
  coachContext,
  coachCopy,
  deriveOnboardingStep,
} from '../domain/onboarding'
import {
  ackReview,
  dismissTour,
  getTourOverride,
  getTourReviewed,
  resetTour,
  startTour,
} from '../tour-state'

describe('deriveOnboardingStep', () => {
  it('sem perfil → profile (Ato 0), independente de meta', () => {
    expect(deriveOnboardingStep({ hasPreference: false, hasGoal: false })).toBe(
      'profile',
    )
    expect(deriveOnboardingStep({ hasPreference: false, hasGoal: true })).toBe(
      'profile',
    )
  })

  it('com perfil e sem meta → goal (Ato 1)', () => {
    expect(deriveOnboardingStep({ hasPreference: true, hasGoal: false })).toBe(
      'goal',
    )
  })

  it('com perfil e meta → done', () => {
    expect(deriveOnboardingStep({ hasPreference: true, hasGoal: true })).toBe(
      'done',
    )
  })
})

describe('coachContext', () => {
  it('lista de concursos', () => {
    expect(coachContext('/concursos')).toBe('list')
    expect(coachContext('/concursos/')).toBe('list')
  })

  it('página do concurso (1 segmento)', () => {
    expect(coachContext('/concursos/pref-niteroi-2026')).toBe('concurso')
  })

  it('página do cargo (2 segmentos) — onde a meta é definida', () => {
    expect(coachContext('/concursos/pref-niteroi-2026/enfermeiro')).toBe('cargo')
  })

  it('qualquer outra rota → away', () => {
    expect(coachContext('/dashboard')).toBe('away')
    expect(coachContext('/perfil')).toBe('away')
    expect(coachContext('/')).toBe('away')
  })
})

describe('coachCopy', () => {
  it('cobre todos os contextos com título e corpo', () => {
    for (const ctx of ['list', 'concurso', 'cargo', 'away'] as const) {
      const copy = coachCopy(ctx)
      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.body.length).toBeGreaterThan(0)
    }
  })
})

describe('tour-state (store compartilhado dashboard ↔ coach)', () => {
  beforeEach(() => resetTour())

  it('começa em null (automático)', () => {
    expect(getTourOverride()).toBeNull()
  })

  it('start → active, dismiss → dismissed, reset → null', () => {
    startTour()
    expect(getTourOverride()).toBe('active')
    dismissTour()
    expect(getTourOverride()).toBe('dismissed')
    resetTour()
    expect(getTourOverride()).toBeNull()
  })

  it('Passo 1: start zera reviewed, ackReview marca, novo start zera de novo', () => {
    startTour()
    expect(getTourReviewed()).toBe(false)
    ackReview()
    expect(getTourReviewed()).toBe(true)
    // Reiniciar o tour tem que trazer o Passo 1 de volta.
    startTour()
    expect(getTourReviewed()).toBe(false)
  })
})
