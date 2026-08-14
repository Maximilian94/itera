// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConcursoGoalToggle } from '../components/ConcursoGoalToggle'
import type { ReactNode } from 'react'
import type { UserGoal } from '../domain/goal.types'
import { installFetchMock } from '@/features/concurso/__tests__/page-test-utils'

function makeGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    id: 'g1',
    createdAt: '2026-08-01T00:00:00.000Z',
    concurso: {
      id: 'c1',
      slug: 'pmc-2026',
      institution: 'Prefeitura de Campinas',
      year: 2026,
    },
    cargo: { id: 'cg1', slug: 'enfermeiro', role: 'Enfermeiro', minPassingGrade: 60 },
    examDate: null,
    provaExamBaseIds: [],
    oficialExamBaseId: null,
    stats: { attemptCount: 0, bestScore: null },
    ...overrides,
  }
}

function renderToggle(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ConcursoGoalToggle', () => {
  it('sem meta → "Definir como meta"', async () => {
    installFetchMock({ '/goals': { body: { goals: [] } } })
    renderToggle(
      <ConcursoGoalToggle concursoId="c1" concursoSlug="pmc-2026" target="pmc-2026" />,
    )
    expect(
      await screen.findByRole('button', { name: /Definir como meta/ }),
    ).toBeTruthy()
  })

  it('casa a meta por Concurso.id → "Sua meta"', async () => {
    installFetchMock({ '/goals': { body: { goals: [makeGoal()] } } })
    renderToggle(
      <ConcursoGoalToggle concursoId="c1" concursoSlug={null} target="c1" />,
    )
    expect(
      await screen.findByRole('button', { name: /Sua meta/ }),
    ).toBeTruthy()
  })

  it('pin: casa por Concurso.slug e reflete o estado em aria-pressed', async () => {
    installFetchMock({ '/goals': { body: { goals: [makeGoal()] } } })
    renderToggle(
      <ConcursoGoalToggle
        concursoId={null}
        concursoSlug="pmc-2026"
        target="pmc-2026"
        name="Prefeitura de Campinas"
        variant="pin"
      />,
    )
    const btn = await screen.findByRole('button', { name: /Sua meta/ })
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('não casa concurso diferente → mantém "Definir como meta"', async () => {
    installFetchMock({ '/goals': { body: { goals: [makeGoal()] } } })
    renderToggle(
      <ConcursoGoalToggle
        concursoId="c2"
        concursoSlug="outro-2026"
        target="outro-2026"
      />,
    )
    expect(
      await screen.findByRole('button', { name: /Definir como meta/ }),
    ).toBeTruthy()
  })
})
