// @vitest-environment jsdom

/**
 * Teste de página da home "Mesa do dia" (/dashboard): herói da meta com
 * prontidão vs corte + retomada, estado sem meta e Recomendados sem os
 * concursos que já são meta. Mesma técnica do harness do concurso
 * (re-parent da rota + fetch mockado por pathname); o Clerk é mockado no
 * módulo de auth.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeConcursoListItem,
  type FetchHandler,
} from '@/features/concurso/__tests__/page-test-utils'
import type { UserGoal } from '@/features/goal/domain/goal.types'
import { Route as DashboardRouteImport } from '@/routes/_authenticated/dashboard'

vi.mock('@/auth/clerk', () => ({
  useClerkAuth: () => ({
    isAuthenticated: true,
    user: { firstName: 'Mariana' },
    isLoading: false,
    login: () => {},
    logout: async () => {},
  }),
}))

/* ------------------------------------------------------------------ */
/*  Router de teste (dashboard + stubs dos destinos linkados)          */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute()
const dashboardRoute = (DashboardRouteImport as any).update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRoute,
})
const stub = (path: string) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null })

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  stub('/concursos'),
  stub('/concursos/$concursoSlug'),
  stub('/concursos/$concursoSlug/$cargoSlug'),
  stub('/evolucao'),
  stub('/evolucao-como-funciona'),
  stub('/onboarding'),
  stub('/planos'),
  stub('/exams/$examBoard/$examId/$attemptId'),
])

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )
}

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const GOAL: UserGoal = {
  id: 'g1',
  createdAt: '2026-08-01T12:00:00.000Z',
  concurso: {
    id: 'conc-1',
    slug: 'pref-niteroi-2026',
    institution: 'Prefeitura de Niterói',
    year: 2026,
  },
  cargo: {
    id: 'cargo-1',
    slug: 'enfermeiro',
    role: 'Enfermeiro',
    minPassingGrade: 60,
  },
  examDate: '2027-01-20T00:00:00.000Z',
  provaExamBaseIds: ['prova-1'],
  oficialExamBaseId: 'prova-1',
  stats: { attemptCount: 1, bestScore: 62 },
}

const TRAINING = {
  trainingId: 't1',
  examBaseId: 'prova-1',
  examBoardId: 'board-1',
  examTitle: 'Prova Enfermeiro COSEAC 2026',
  cargoSlug: 'enfermeiro',
  cargoLabel: 'Enfermeiro',
  concursoSlug: 'pref-niteroi-2026',
  concursoTitle: 'Prefeitura de Niterói 2026',
  currentStage: 'STUDY',
  attemptId: 'a1',
  createdAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-07T12:00:00.000Z',
  attemptFinishedAt: '2026-08-05T13:00:00.000Z',
  minPassingGrade: 60,
  initialScorePercentage: 55,
  finalScorePercentage: null,
}

const ACCESS = {
  hasAccess: true,
  status: 'active',
  plan: 'ESTRATEGICO',
  currentPeriodEnd: '2027-09-01T00:00:00.000Z',
  canRequestRefund: false,
  trainingLimit: 5,
  trainingsUsedThisMonth: 2,
}

const HISTORY = [
  {
    id: 'a1',
    examBaseId: 'prova-1',
    startedAt: '2026-08-05T12:00:00.000Z',
    finishedAt: '2026-08-05T13:00:00.000Z',
    examBaseName: 'Prova Enfermeiro',
    institution: 'Prefeitura de Niterói',
    examDate: '2027-01-20T00:00:00.000Z',
    examBoardName: 'COSEAC',
    examBoardAlias: 'COSEAC',
    examBoardId: 'board-1',
    minPassingGradeNonQuota: 60,
    percentage: 62,
    passed: true,
  },
]

const RECOMMENDED = makeConcursoListItem({
  slug: 'ebserh-2026',
  institution: 'EBSERH',
  match: { recommended: true, reasons: ['NATIONWIDE', 'SALARY'] },
})
/** Mesmo concurso da meta — não pode reaparecer nos Recomendados. */
const GOAL_CONCURSO = makeConcursoListItem({
  slug: 'pref-niteroi-2026',
  institution: 'Prefeitura de Niterói',
  match: { recommended: true, reasons: ['CITY'] },
})

function mockHome(overrides: Record<string, FetchHandler> = {}) {
  installFetchMock({
    '/stripe/access': { body: ACCESS },
    '/goals': { body: { goals: [GOAL] } },
    '/training': { body: [TRAINING] },
    '/exam-base-attempts/history': { body: HISTORY },
    '/preferences': { body: { preference: { state: 'RJ', city: 'Niterói' } } },
    '/concursos': { body: { concursos: [RECOMMENDED, GOAL_CONCURSO] } },
    ...overrides,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

/* ------------------------------------------------------------------ */

describe('Home "Mesa do dia"', () => {
  it('herói da meta: título, prontidão vs corte, retomada e cota', async () => {
    mockHome()
    const { container } = renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: /Enfermeiro — Prefeitura de Niterói/,
      }),
    ).toBeTruthy()

    // Prontidão vs corte (2 p.p. acima) + retomada da fase de Estudo.
    expect(screen.getByText(/2 p\.p\. acima/)).toBeTruthy()
    expect(screen.getByText(/Fase de Estudo/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Continuar treino/ }),
    ).toBeTruthy()

    // Cota vira linha discreta, não card.
    expect(
      screen.getByText(/2 de 5 treinos usados este mês/),
    ).toBeTruthy()

    // Blocos de apoio.
    expect(
      screen.getByRole('heading', { name: 'Sua semana' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Evolução' }),
    ).toBeTruthy()

    await expectNoSeriousAxeViolations(container)
  })

  it('Recomendados exclui o concurso que já é meta', async () => {
    mockHome()
    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: 'Recomendados para você' }),
    ).toBeTruthy()
    expect(screen.getByText(/EBSERH · \d{4}/)).toBeTruthy()
    // O concurso da meta não reaparece como recomendação.
    expect(screen.queryByText(/Prefeitura de Niterói · \d{4}/)).toBeNull()
  })

  it('sem meta → convite "Escolha seu próximo concurso"', async () => {
    mockHome({ '/goals': { body: { goals: [] } }, '/training': { body: [] } })
    renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: 'Escolha seu próximo concurso',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Explorar concursos/ }),
    ).toBeTruthy()
    expect(screen.queryByText(/Continuar treino/)).toBeNull()
  })

  it('meta sem treino ativo → CTA "Começar treino" com o primeiro passo', async () => {
    mockHome({ '/training': { body: [] } })
    renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: /Enfermeiro — Prefeitura de Niterói/,
      }),
    ).toBeTruthy()
    expect(screen.getByText(/Primeiro passo · Diagnóstico/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Começar treino/ }),
    ).toBeTruthy()
  })

  it('sem perfil de preferências → convite para criar o perfil', async () => {
    mockHome({ '/preferences': { body: { preference: null } } })
    renderDashboard()

    await waitFor(() =>
      expect(screen.getByText(/Criar perfil/)).toBeTruthy(),
    )
  })
})
