import { describe, expect, it } from 'vitest'
import {
  BRAZIL_BOUNDS,
  boundsOf,
  buildMapPoints,
} from '../concurso-map.logic'
import type {
  ConcursoListItem,
  ConcursoStatus,
  GeoPoint,
} from '@/features/concurso/domain/concurso.types'

/* Datas relativas a hoje: os comparadores olham "dias até", não datas fixas,
 * então fixar ISO no teste o quebraria com o passar do tempo. */
function inDays(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString()
}

const SP: GeoPoint = { lat: -23.5505, lng: -46.6333, precision: 'city' }
const CAMPINAS: GeoPoint = { lat: -22.9099, lng: -47.0626, precision: 'city' }

function make(
  overrides: Partial<ConcursoListItem> & { slug: string },
): ConcursoListItem {
  const status: ConcursoStatus = overrides.status ?? 'future'
  return {
    id: overrides.slug,
    institution: 'Prefeitura',
    year: 2026,
    governmentScope: 'MUNICIPAL',
    state: 'SP',
    city: 'São Paulo',
    coords: SP,
    examBoard: null,
    cargoCount: 1,
    vacancyTotal: 1,
    hasCR: false,
    salaryMin: null,
    salaryMax: null,
    questionCount: 0,
    userStats: { attemptedCargos: 0, bestScore: null },
    timeline: {
      registrationStart: null,
      registrationEnd: null,
      examDate: inDays(90),
      resultDate: null,
    },
    ...overrides,
    status,
  }
}

describe('buildMapPoints', () => {
  it('agrupa concursos da mesma coordenada num ponto só', () => {
    const { points } = buildMapPoints([
      make({ slug: 'a' }),
      make({ slug: 'b' }),
      make({ slug: 'c', coords: CAMPINAS, city: 'Campinas' }),
    ])
    expect(points).toHaveLength(2)
    const sp = points.find((p) => p.label === 'São Paulo/SP')!
    expect(sp.items).toHaveLength(2)
    expect(sp.label).toBe('São Paulo/SP')
  })

  /* O caso que motiva o agrupamento: sem ele, um marcador cobriria o outro. */
  it('cidades diferentes não se fundem', () => {
    const { points } = buildMapPoints([
      make({ slug: 'a' }),
      make({ slug: 'c', coords: CAMPINAS, city: 'Campinas' }),
    ])
    expect(points.map((p) => p.label).sort()).toEqual([
      'Campinas/SP',
      'São Paulo/SP',
    ])
  })

  it('sem coords → offMap, não some', () => {
    const { points, offMap } = buildMapPoints([
      make({ slug: 'federal', coords: null, governmentScope: 'FEDERAL' }),
      make({ slug: 'no-uf', coords: null, state: null, city: null }),
      make({ slug: 'mapeavel' }),
    ])
    expect(points).toHaveLength(1)
    expect(offMap.map((i) => i.slug).sort()).toEqual(['federal', 'no-uf'])
  })

  it('coords ausente no payload (cache antigo) não quebra', () => {
    const item = make({ slug: 'velho' })
    delete (item as { coords?: unknown }).coords
    const { points, offMap } = buildMapPoints([item])
    expect(points).toHaveLength(0)
    expect(offMap).toHaveLength(1)
  })

  describe('eleição do representante', () => {
    it('inscrição aberta ganha de futura e passada', () => {
      const { points } = buildMapPoints([
        make({ slug: 'passada', status: 'past', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(-30), resultDate: null } }),
        make({ slug: 'futura', status: 'future' }),
        make({ slug: 'aberta', status: 'open', timeline: { registrationStart: inDays(-5), registrationEnd: inDays(20), examDate: inDays(60), resultDate: null } }),
      ])
      expect(points[0].primary.slug).toBe('aberta')
      expect(points[0].items.map((i) => i.slug)).toEqual([
        'aberta',
        'futura',
        'passada',
      ])
    })

    it('entre abertas, vence a que fecha antes', () => {
      const { points } = buildMapPoints([
        make({ slug: 'folgada', status: 'open', timeline: { registrationStart: inDays(-5), registrationEnd: inDays(30), examDate: null, resultDate: null } }),
        make({ slug: 'urgente', status: 'open', timeline: { registrationStart: inDays(-5), registrationEnd: inDays(2), examDate: null, resultDate: null } }),
      ])
      expect(points[0].primary.slug).toBe('urgente')
    })

    it('entre futuras, vence a prova mais próxima', () => {
      const { points } = buildMapPoints([
        make({ slug: 'longe', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(200), resultDate: null } }),
        make({ slug: 'perto', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(10), resultDate: null } }),
      ])
      expect(points[0].primary.slug).toBe('perto')
    })

    it('entre passadas, vence a mais recente', () => {
      const { points } = buildMapPoints([
        make({ slug: 'antiga', status: 'past', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(-400), resultDate: null } }),
        make({ slug: 'recente', status: 'past', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(-20), resultDate: null } }),
      ])
      expect(points[0].primary.slug).toBe('recente')
    })

    it('sem data não rouba a representação de quem tem', () => {
      const { points } = buildMapPoints([
        make({ slug: 'sem-data', timeline: { registrationStart: null, registrationEnd: null, examDate: null, resultDate: null } }),
        make({ slug: 'com-data', timeline: { registrationStart: null, registrationEnd: null, examDate: inDays(50), resultDate: null } }),
      ])
      expect(points[0].primary.slug).toBe('com-data')
    })
  })

  it('marca o ponto como recomendado se qualquer concurso dele for', () => {
    const { points } = buildMapPoints([
      make({ slug: 'a' }),
      make({ slug: 'b', match: { recommended: true, reasons: ['CITY'] } }),
    ])
    expect(points[0].recommended).toBe(true)
  })

  it('sem recomendação, o ponto não é destacado', () => {
    const { points } = buildMapPoints([
      make({ slug: 'a' }),
      make({ slug: 'b', match: { recommended: false, reasons: [] } }),
    ])
    expect(points[0].recommended).toBe(false)
  })

  it('precisão de estado rotula pela UF, não inventa cidade', () => {
    const { points } = buildMapPoints([
      make({
        slug: 'estadual',
        governmentScope: 'STATE',
        state: 'PR',
        city: null,
        coords: { lat: -24.5, lng: -51.5, precision: 'state' },
      }),
    ])
    expect(points[0].precision).toBe('state')
    expect(points[0].label).toBe('PR')
  })

  it('lista vazia → nada, sem estourar', () => {
    expect(buildMapPoints([])).toEqual({ points: [], offMap: [] })
  })

  it('não muta o array recebido', () => {
    const input = [make({ slug: 'b' }), make({ slug: 'a', status: 'open' })]
    const copy = [...input]
    buildMapPoints(input)
    expect(input).toEqual(copy)
  })
})

describe('boundsOf', () => {
  it('enquadra todos os pontos', () => {
    const { points } = buildMapPoints([
      make({ slug: 'a' }),
      make({ slug: 'c', coords: CAMPINAS, city: 'Campinas' }),
    ])
    const b = boundsOf(points)!
    expect(b[0][0]).toBeCloseTo(-23.5505, 3) // sul
    expect(b[1][0]).toBeCloseTo(-22.9099, 3) // norte
    expect(b[0][1]).toBeCloseTo(-47.0626, 3) // oeste
    expect(b[1][1]).toBeCloseTo(-46.6333, 3) // leste
  })

  it('sem pontos → null (chamador cai no Brasil)', () => {
    expect(boundsOf([])).toBeNull()
  })

  it('BRAZIL_BOUNDS cobre os extremos continentais', () => {
    const [[s, w], [n, e]] = BRAZIL_BOUNDS
    expect(s).toBeLessThan(-33) // Chuí
    expect(n).toBeGreaterThan(5) // Monte Caburaí
    expect(w).toBeLessThan(-73) // Serra do Divisor
    expect(e).toBeGreaterThan(-35) // Ponta do Seixas
  })
})
