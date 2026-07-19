// @vitest-environment jsdom

/** Página admin "Gerenciar concursos" (/admin/gerenciar-concursos):
 *  listagem (atenção × concluídos), busca de novos concursos no pciconcursos e
 *  add lazy com destaque de "sem link oficial". Rede mockada por pathname. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AdminConcursoRow,
  DiscoverySearchResult,
} from '../scraper.types'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
} from '@/features/concurso/__tests__/page-test-utils'
import { Route as GerenciarRouteImport } from '@/routes/_authenticated/admin/gerenciar-concursos'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const PATH = '/admin/gerenciar-concursos'
const PROFILE = '/auth/me'
const LIST = '/admin/scraper/concursos'
const SEARCH = '/admin/scraper/discovery/search'
const ADD = '/admin/scraper/discovery/add'

/** Re-parenta a rota admin num root de teste (pula o layout _authenticated). */
const rootRoute = createRootRoute()
const gerenciarRoute = (GerenciarRouteImport as any).update({
  id: PATH,
  path: PATH,
  getParentRoute: () => rootRoute,
})
const stub = (path: string) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null })
const routeTree = rootRoute.addChildren([
  gerenciarRoute,
  stub('/concursos/$concursoSlug'),
  stub('/admin/editar-concurso/$concursoId'),
  stub('/dashboard'),
])

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [PATH] }),
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )
}

const ROWS: Array<AdminConcursoRow> = [
  {
    id: 'c-santos',
    slug: null,
    institution: 'Prefeitura de Santos',
    state: 'SP',
    year: 2026,
    status: 'open',
    provaCount: 0,
    needsSourceUrl: true,
    registrationEnd: '2026-08-01',
    createdAt: '2026-07-10T00:00:00.000Z',
  },
  {
    id: 'c-govsp',
    slug: 'gov-sp-2023',
    institution: 'Governo de São Paulo',
    state: 'SP',
    year: 2023,
    status: 'past',
    provaCount: 2,
    needsSourceUrl: false,
    registrationEnd: null,
    createdAt: '2023-01-10T00:00:00.000Z',
  },
]

const SEARCH_RESULT: DiscoverySearchResult = {
  cargoSlug: 'enfermeiro',
  fetchedAt: '2026-07-19T00:00:00.000Z',
  candidates: [
    {
      institution: 'Hospital Odilon Behrens',
      uf: 'MG',
      headline: 'Hospital Odilon Behrens - MG abre concurso público',
      newsUrl: 'https://www.pciconcursos.com.br/noticias/hospital-odilon-mg',
      status: 'new',
      matched: null,
    },
    {
      institution: 'Prefeitura de Santos',
      uf: 'SP',
      headline: 'Prefeitura de Santos - SP abre editais',
      newsUrl: 'https://www.pciconcursos.com.br/noticias/prefeitura-santos-sp',
      status: 'exists',
      matched: { id: 'c-santos', slug: null },
    },
  ],
}

function mockAll(extra: Parameters<typeof installFetchMock>[0] = {}) {
  installFetchMock({
    [PROFILE]: { body: { user: { role: 'ADMIN' } } },
    [LIST]: { body: ROWS },
    ...extra,
  })
}

describe('gerenciar concursos (admin)', () => {
  it('separa concursos em atenção × concluídos e destaca o sem link oficial', async () => {
    mockAll()
    const { container } = renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gerenciar concursos' }),
    ).toBeTruthy()

    // Santos (aberto, sem link) na seção de atenção com o badge; Governo (past) concluído.
    expect(await screen.findByText('Prefeitura de Santos')).toBeTruthy()
    expect(screen.getByText('sem link oficial')).toBeTruthy()
    expect(screen.getByText('Inscrições abertas')).toBeTruthy()
    expect(screen.getByText('Governo de São Paulo')).toBeTruthy()
    expect(screen.getByText('Concluído')).toBeTruthy()

    await expectNoSeriousAxeViolations(container)
  })

  it('procura novos concursos e adiciona um sem link oficial (highlight)', async () => {
    mockAll({
      [SEARCH]: { body: SEARCH_RESULT },
      [ADD]: {
        body: {
          concurso: { id: 'novo', slug: 'hospital-2026', institution: 'Hospital Odilon Behrens' },
          officialUrlFound: false,
          created: true,
        },
      },
    })
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: /Procurar novos concursos/ }),
    )

    // Candidato novo com botão Adicionar; o já cadastrado aparece esmaecido.
    expect(await screen.findByText('Hospital Odilon Behrens')).toBeTruthy()
    expect(screen.getByText('já cadastrado')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    // Add lazy sem link oficial → destaque para captura manual.
    expect(
      await screen.findByText(/sem link oficial — pegar manual/),
    ).toBeTruthy()
  })
})
