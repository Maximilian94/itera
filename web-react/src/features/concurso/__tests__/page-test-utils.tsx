/**
 * Harness dos testes de página do concurso (MAX-26).
 *
 * Mesma técnica do routeTree.gen: as rotas reais de nível 1/2 são
 * re-parentadas num root de teste (sem o layout _authenticated, que exige
 * Clerk), mais stubs para os destinos linkados. A rede é mockada no fetch —
 * único choke point de todos os services (`apiFetch`) — com payloads JSON
 * por pathname, no espírito "MSW sem MSW".
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { expect, vi } from 'vitest'
import axe from 'axe-core'
import type {
  CargoDetail,
  CargoSummary,
  ConcursoDetail,
  SubjectDistribution,
} from '../domain/concurso.types'
import { Route as ConcursoRouteImport } from '@/routes/_authenticated/concursos/$concursoSlug/index'
import { Route as CargoRouteImport } from '@/routes/_authenticated/concursos/$concursoSlug/$cargoSlug'

/* ------------------------------------------------------------------ */
/*  Router de teste                                                    */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute()

const concursoRoute = (ConcursoRouteImport as any).update({
  id: '/concursos/$concursoSlug/',
  path: '/concursos/$concursoSlug/',
  getParentRoute: () => rootRoute,
})
const cargoRoute = (CargoRouteImport as any).update({
  id: '/concursos/$concursoSlug/$cargoSlug',
  path: '/concursos/$concursoSlug/$cargoSlug',
  getParentRoute: () => rootRoute,
})

/** Destinos de Link/navigate das páginas; só precisam existir na árvore. */
const stub = (path: string) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null })

const routeTree = rootRoute.addChildren([
  concursoRoute,
  cargoRoute,
  stub('/exams'),
  stub('/exams/$examBoard/$examId'),
  stub('/exams/$examBoard/$examId/$attemptId'),
  stub('/treino'),
  stub('/planos'),
])

/** Monta a rota em `path` com React Query + router de memória reais. */
export function renderPage(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )
  return { ...utils, router }
}

/* ------------------------------------------------------------------ */
/*  Mock de rede (fetch por pathname)                                  */
/* ------------------------------------------------------------------ */

/** `'pending'` deixa a request pendurada para testar estados de loading. */
export type FetchHandler = { status?: number; body: unknown } | 'pending'

/** Mocka `fetch` por pathname; rotas sem handler respondem 404. */
export function installFetchMock(handlers: Record<string, FetchHandler>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      const path = new URL(url).pathname
      const handler =
        handlers[path] ??
        ({ status: 404, body: { message: `Sem mock para ${path}` } } as const)
      if (handler === 'pending') return new Promise<never>(() => {})
      const { status = 200, body } = handler
      // Shape mínimo que o apiFetch consome — independe de Response no jsdom.
      return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      }
    }),
  )
}

/* ------------------------------------------------------------------ */
/*  Axe                                                                */
/* ------------------------------------------------------------------ */

/**
 * Zero violações axe sérias/críticas. `color-contrast` fica de fora porque
 * o jsdom não renderiza de verdade; o contraste é coberto pelo teste de
 * tokens (contrast.test.ts) + checklist manual no browser.
 */
export async function expectNoSeriousAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    serious.map((v) => `${v.id}: ${v.help} → ${v.nodes[0]?.html}`),
  ).toEqual([])
}

/* ------------------------------------------------------------------ */
/*  Factories de payload (espelham a API)                              */
/* ------------------------------------------------------------------ */

export function makeCargoSummary(
  overrides: Partial<CargoSummary> = {},
): CargoSummary {
  return {
    id: 'exam-1',
    slug: 'enfermeiro',
    role: 'Enfermeiro',
    vacancyCount: 10,
    hasReserveList: true,
    salaryBase: '8500',
    workload: '40h semanais',
    questionCount: 50,
    minPassingGrade: '60',
    published: true,
    userStats: { attemptCount: 2, bestScore: 72 },
    ...overrides,
  }
}

export function makeConcursoDetail(overrides?: {
  concurso?: Partial<ConcursoDetail['concurso']>
  cargos?: Array<CargoSummary>
}): ConcursoDetail {
  return {
    concurso: {
      id: 'c1',
      slug: 'pmc-2026',
      institution: 'Prefeitura de Campinas',
      year: 2026,
      governmentScope: 'MUNICIPAL',
      state: 'SP',
      city: 'Campinas',
      examBoard: { id: 'board-1', name: 'Fundação VUNESP', alias: 'VUNESP' },
      editalUrl: 'https://example.com/edital.pdf',
      status: 'open',
      // registrationEnd/examDate nulos → labels determinísticos (sem "N dias").
      timeline: {
        registrationStart: '2026-06-02T00:00:00.000Z',
        registrationEnd: null,
        examDate: '2026-08-23T00:00:00.000Z',
        resultDate: null,
      },
      summary: {
        vacancyTotal: 12,
        hasCR: true,
        salaryMin: '4800',
        salaryMax: '8500',
        registrationFee: '85',
        cargoCount: 2,
      },
      ...overrides?.concurso,
    },
    cargos: overrides?.cargos ?? [
      makeCargoSummary(),
      makeCargoSummary({
        id: 'exam-2',
        slug: 'tecnico-de-enfermagem',
        role: 'Técnico de Enfermagem',
        salaryBase: '4800',
        vacancyCount: 2,
        userStats: { attemptCount: 0, bestScore: null },
      }),
    ],
  }
}

export function makeCargoDetail(overrides?: {
  concurso?: Partial<CargoDetail['concurso']>
  cargo?: Partial<CargoDetail['cargo']>
  syllabusGroups?: CargoDetail['syllabusGroups']
  previousExams?: CargoDetail['previousExams']
  studyPlan?: Partial<CargoDetail['studyPlan']>
}): CargoDetail {
  return {
    concurso: {
      id: 'c1',
      slug: 'pmc-2026',
      institution: 'Prefeitura de Campinas',
      year: 2026,
      status: 'past',
      examBoard: { id: 'board-1', name: 'Fundação VUNESP', alias: 'VUNESP' },
      examDate: '2023-05-14T00:00:00.000Z',
      ...overrides?.concurso,
    },
    cargo: {
      id: 'exam-1',
      slug: 'enfermeiro',
      role: 'Enfermeiro',
      description: null,
      requirements: 'Superior em Enfermagem + COREN ativo',
      salaryBase: '8500',
      workload: '40h semanais',
      vacancyCount: 10,
      hasReserveList: true,
      registrationFee: '85',
      minPassingGrade: '60',
      questionCount: 50,
      examDate: '2023-05-14T00:00:00.000Z',
      editalUrl: 'https://example.com/edital.pdf',
      published: true,
      ...overrides?.cargo,
    },
    syllabusGroups: overrides?.syllabusGroups ?? [],
    previousExams: overrides?.previousExams ?? [],
    studyPlan: {
      currentStep: 'diagnostico',
      attemptCount: 0,
      bestScore: null,
      scoreDelta: null,
      weakSubjects: [],
      ...overrides?.studyPlan,
    },
  }
}

export function makeDistribution(
  overrides: Partial<SubjectDistribution> = {},
): SubjectDistribution {
  return {
    mode: 'actual',
    sourceExams: [],
    totalQuestions: 50,
    subjects: [
      { subject: 'Enfermagem', count: 25, share: 0.5, userAccuracy: null },
      { subject: 'SUS', count: 15, share: 0.3, userAccuracy: null },
      { subject: 'Português', count: 10, share: 0.2, userAccuracy: null },
    ],
    insight: {
      topSubjects: ['Enfermagem', 'SUS'],
      topShare: 0.8,
      weakestRelevant: null,
    },
    ...overrides,
  }
}
