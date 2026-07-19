// @vitest-environment jsdom

/**
 * Teste de página de /admin/criar-concurso (mesma técnica do harness de
 * concurso: rota real re-parentada num root de teste + fetch mockado).
 *
 * O payload de extração espelha o caso real do edital de Altos (PI) —
 * vários campos null (examDate, registrationStart, requirements...) que o
 * fixture sintético não cobria.
 */
import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Route as CriarConcursoRouteImport } from '@/routes/_authenticated/admin/criar-concurso'

const rootRoute = createRootRoute()

const criarConcursoRoute = (CriarConcursoRouteImport as any).update({
  id: '/admin/criar-concurso',
  path: '/admin/criar-concurso',
  getParentRoute: () => rootRoute,
})

const stub = (path: string) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: () => null })

const routeTree = rootRoute.addChildren([
  criarConcursoRoute,
  stub('/dashboard'),
  stub('/admin/document-scraper'),
  stub('/concursos/$concursoSlug'),
])

function renderCriarConcurso(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  // StrictMode como no app real (main.tsx): double-render/effects em dev já
  // mascararam bugs de mutation que o render simples não pega.
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router as never} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

/** Payload real da extração do edital de Altos (PI) — Igeduc, 2026. */
const EXTRACTED_ALTOS = {
  name: 'Concurso Público Prefeitura de Altos 2026',
  governmentScope: 'MUNICIPAL',
  examDate: '2026-08-29',
  institution: 'Prefeitura Municipal de Altos',
  state: 'PI',
  city: 'Altos',
  examBoardName: 'Instituto Igeduc',
  // Como na resposta real do caso Altos: a IA não achou sigla da banca.
  examBoardAlias: null,
  editalUrl: 'https://igeduc.selecao.net.br/informacoes/143/',
  registrationStart: '2026-05-18',
  registrationEnd: '2026-07-13',
  resultDate: null,
  etapas: [
    {
      name: 'Prova Objetiva',
      description: 'Caráter eliminatório e classificatório, para todos os cargos.',
    },
    { name: 'Prova de Títulos', description: 'Nível superior.' },
  ],
  cargos: [
    {
      role: 'Motorista',
      salaryBase: '1600.00',
      vacancyCount: 5,
      hasReserveList: true,
      workload: '40 horas semanais',
      registrationFee: '90.00',
      minPassingGradeNonQuota: '70.00',
      requirements: 'Ensino fundamental completo e CNH categoria D',
      description: null,
      isNursingRelevant: false,
    },
    {
      role: 'Enfermeiro',
      salaryBase: '4750.00',
      vacancyCount: 12,
      hasReserveList: true,
      workload: '40 horas semanais',
      registrationFee: '110.00',
      minPassingGradeNonQuota: '70.00',
      requirements: 'Ensino superior em Enfermagem e registro no COREN',
      description: 'Administrar medicamentos e tratamentos prescritos.',
      isNursingRelevant: true,
    },
    {
      role: 'Professor de Matemática',
      salaryBase: '6120.83',
      vacancyCount: 20,
      hasReserveList: true,
      workload: '40 horas semanais',
      registrationFee: '110.00',
      minPassingGradeNonQuota: '70.00',
      requirements: 'Licenciatura em Matemática',
      description: null,
      isNursingRelevant: false,
    },
  ],
}

const EDITAL_URL =
  'https://anexos-r2.selecao.net.br/uploads/797/concursos/143/anexos/4479930a-6ff6-4d64-a91a-433a5959d68c.pdf'

/** Como o installFetchMock do harness, mas com latência na extração — a
 *  resposta real leva ~10s e o timing muda o comportamento sob StrictMode. */
function installDelayedFetchMock() {
  const respond = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  })
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
      if (path === '/auth/me') return respond(200, { user: { role: 'ADMIN' } })
      if (path === '/exam-boards') return respond(200, [])
      if (path === '/exam-bases/extract-edital') {
        await new Promise((r) => setTimeout(r, 150))
        return respond(201, EXTRACTED_ALTOS)
      }
      return respond(404, { message: `Sem mock para ${path}` })
    }),
  )
}

describe('página /admin/criar-concurso', () => {
  it('chegando do scraper: auto-extrai e mostra o form de revisão preenchido', async () => {
    installDelayedFetchMock()

    renderCriarConcurso(
      `/admin/criar-concurso?editalUrl=${encodeURIComponent(EDITAL_URL)}&editalName=${encodeURIComponent(
        'EDITAL Nº 001/2026 DO CONCURSO PÚBLICO DO MUNICÍPIO DE ALTOS (PI)',
      )}`,
    )

    // O form de revisão precisa aparecer após a extração...
    await screen.findByText(/Revisar dados do concurso/, undefined, {
      timeout: 5000,
    })
    // ...com os campos do concurso aplicados...
    expect(
      screen.getByDisplayValue('Prefeitura Municipal de Altos'),
    ).toBeTruthy()
    // ...as etapas do certame editáveis...
    expect(screen.getByText('Etapas do concurso (2)')).toBeTruthy()
    expect(screen.getByDisplayValue('Prova Objetiva')).toBeTruthy()
    // ...todos os cargos listados, enfermagem primeiro...
    expect(screen.getByText('Cargos (3)')).toBeTruthy()
    const roles = screen
      .getAllByText(/Enfermeiro|Motorista|Professor de Matemática/)
      .map((el) => el.textContent)
    expect(roles[0]).toBe('Enfermeiro')
    expect(screen.getByText('Enfermagem')).toBeTruthy()
    // ...e o estado de "extraindo" precisa SUMIR (bug do spinner infinito).
    await waitFor(() => {
      expect(screen.queryByText(/extraindo os dados do concurso/)).toBeNull()
    })
  })
})
