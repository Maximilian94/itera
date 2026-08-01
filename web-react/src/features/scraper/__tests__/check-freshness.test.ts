import { describe, expect, it } from 'vitest'
import {
  STALE_AFTER_DAYS,
  checkFreshness,
  daysSinceCheck,
} from '../check-freshness'

/** 1º de agosto de 2026, meio-dia (hora local) — "hoje" de referência. */
const NOW = new Date(2026, 7, 1, 12, 0, 0)
/** Mesmo dia, mas de madrugada — a contagem é por dia de calendário. */
const at = (y: number, m: number, d: number, h = 9) =>
  new Date(y, m, d, h).toISOString()

describe('daysSinceCheck', () => {
  it('nunca verificado (null) não tem contagem', () => {
    expect(daysSinceCheck(null, NOW)).toBeNull()
    expect(daysSinceCheck(undefined, NOW)).toBeNull()
  })

  it('conta em dias de calendário, não em blocos de 24h', () => {
    // Ontem às 23h faz ~13 horas, mas o admin lê como "há 1 dia".
    expect(daysSinceCheck(at(2026, 6, 31, 23), NOW)).toBe(1)
    expect(daysSinceCheck(at(2026, 7, 1, 0), NOW)).toBe(0)
    expect(daysSinceCheck(at(2026, 6, 25), NOW)).toBe(7)
  })

  it('data futura (relógio adiantado) satura em 0 em vez de negativo', () => {
    expect(daysSinceCheck(at(2026, 7, 5), NOW)).toBe(0)
  })

  it('data inválida é tratada como sem contagem', () => {
    expect(daysSinceCheck('não é data', NOW)).toBeNull()
  })
})

describe('checkFreshness', () => {
  it('nunca verificado é atrasado por definição', () => {
    expect(checkFreshness(null, NOW)).toEqual({
      days: null,
      label: 'nunca verificado',
      stale: true,
    })
  })

  it('rotula hoje, singular e plural', () => {
    expect(checkFreshness(at(2026, 7, 1), NOW).label).toBe('verificado hoje')
    expect(checkFreshness(at(2026, 6, 31), NOW).label).toBe('há 1 dia')
    expect(checkFreshness(at(2026, 6, 29), NOW).label).toBe('há 3 dias')
  })

  it('vira atrasado ao atingir o limite, não depois', () => {
    const fresh = new Date(NOW)
    fresh.setDate(fresh.getDate() - (STALE_AFTER_DAYS - 1))
    const stale = new Date(NOW)
    stale.setDate(stale.getDate() - STALE_AFTER_DAYS)

    expect(checkFreshness(fresh.toISOString(), NOW).stale).toBe(false)
    expect(checkFreshness(stale.toISOString(), NOW).stale).toBe(true)
  })
})
