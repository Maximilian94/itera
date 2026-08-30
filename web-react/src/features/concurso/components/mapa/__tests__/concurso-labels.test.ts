import { describe, expect, it } from 'vitest'
import type { ConcursoListItem } from '@/features/concurso/domain/concurso.types'
import {
  shortCountdown,
  shortSalary,
} from '@/features/concurso/components/concurso-labels'

function inDays(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  ).toISOString()
}

function make(over: Partial<ConcursoListItem> = {}): ConcursoListItem {
  return {
    id: 'c1',
    slug: 's',
    institution: 'Prefeitura',
    year: 2026,
    governmentScope: 'MUNICIPAL',
    state: 'SP',
    city: 'Campinas',
    coords: null,
    examBoard: null,
    status: 'future',
    timeline: {
      registrationStart: null,
      registrationEnd: null,
      examDate: null,
      resultDate: null,
    },
    cargoCount: 1,
    vacancyTotal: 0,
    hasCR: false,
    salaryMin: null,
    salaryMax: null,
    questionCount: 0,
    userStats: { attemptedCargos: 0, bestScore: null },
    ...over,
  }
}

/* A pílula do mapa tem ~190px: o rótulo precisa ser curto E dizer QUAL prazo
 * está contando. Estes casos vieram de dados reais da base. */
describe('shortCountdown', () => {
  it('inscrição aberta conta o prazo da INSCRIÇÃO, não o da prova', () => {
    expect(
      shortCountdown(
        make({
          status: 'open',
          timeline: {
            registrationStart: inDays(-10),
            registrationEnd: inDays(4),
            examDate: inDays(90),
            resultDate: null,
          },
        }),
      ),
    ).toBe('inscr. 4d')
  })

  /* O caso que motivou a mudança: a maioria dos editais abertos da base ainda
   * não tem data de prova. Antes o rótulo virava "—" e não dizia nada. */
  it('aberta sem data de prova ainda diz algo útil', () => {
    expect(
      shortCountdown(
        make({
          status: 'open',
          timeline: {
            registrationStart: inDays(-10),
            registrationEnd: inDays(7),
            examDate: null,
            resultDate: null,
          },
        }),
      ),
    ).toBe('inscr. 7d')
  })

  it('aberta com prazo encerrando hoje é dito por extenso', () => {
    expect(
      shortCountdown(
        make({
          status: 'open',
          timeline: {
            registrationStart: inDays(-10),
            registrationEnd: inDays(0),
            examDate: null,
            resultDate: null,
          },
        }),
      ),
    ).toBe('inscr. encerra hoje')
  })

  it('aberta sem janela conhecida não inventa prazo', () => {
    expect(shortCountdown(make({ status: 'open' }))).toBe('inscrições abertas')
  })

  it('futura conta para a prova, em dias e depois em meses', () => {
    expect(
      shortCountdown(
        make({
          timeline: {
            registrationStart: null,
            registrationEnd: null,
            examDate: inDays(12),
            resultDate: null,
          },
        }),
      ),
    ).toBe('prova 12d')
    expect(
      shortCountdown(
        make({
          timeline: {
            registrationStart: null,
            registrationEnd: null,
            examDate: inDays(90),
            resultDate: null,
          },
        }),
      ),
    ).toBe('prova 3 meses')
  })

  it('futura sem data marcada é honesta sobre isso', () => {
    expect(shortCountdown(make({ status: 'future' }))).toBe('prova a definir')
  })

  it('passada mostra quando foi aplicada', () => {
    const label = shortCountdown(
      make({
        status: 'past',
        timeline: {
          registrationStart: null,
          registrationEnd: null,
          examDate: '2024-03-10T00:00:00.000Z',
          resultDate: null,
        },
      }),
    )
    expect(label).toContain('2024')
    expect(shortCountdown(make({ status: 'past' }))).toBe('aplicada')
  })
})

describe('shortSalary', () => {
  /* O Intl separa "R$" do número com espaço NÃO-quebrável (U+00A0); comparar
   * com espaço comum falha por um caractere invisível. */
  const normalizeSpaces = (v: string | null) => v?.replace(/\s/g, ' ') ?? null

  it('mostra só o teto, para caber na pílula', () => {
    expect(normalizeSpaces(shortSalary(make({ salaryMax: '8500' })))).toBe(
      'até R$ 8.500',
    )
  })

  it('sem salário conhecido → null (a pílula omite o pedaço)', () => {
    expect(shortSalary(make())).toBeNull()
  })
})
