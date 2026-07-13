// @vitest-environment jsdom

/** Listagem/descoberta de concursos (nível 0, MAX-28): payload mockado,
 *  filtros client-side, estados e axe. */
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeConcursoList,
  makeConcursoListItem,
  renderPage,
} from './page-test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const LIST_PATH = '/concursos'
const API = '/concursos'
const PROFILE = '/auth/me'

/** Mock de listagem + perfil (não-admin por padrão). */
function mockList(body: unknown, profile: unknown = { user: null }) {
  installFetchMock({ [API]: { body }, [PROFILE]: { body: profile } })
}

describe('listagem de concursos (nível 0)', () => {
  it('mostra a aba ativa por padrão (Abertas) e troca de estado pelo toggle', async () => {
    mockList(makeConcursoList())
    renderPage(LIST_PATH)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Concursos' }),
    ).toBeTruthy()

    // Padrão = Abertas → só o concurso aberto (Campinas); o passado fica oculto
    const open = await screen.findByRole('link', {
      name: 'Ver concurso Prefeitura de Campinas 2026',
    })
    expect(open.getAttribute('href')).toBe('/concursos/pmc-2026')
    expect(screen.queryByRole('link', { name: /Governo de São Paulo/ })).toBeNull()
    expect(screen.getByText(/Inscrições abertas/)).toBeTruthy()
    expect(screen.getByText(/R\$\s*4\.800\s*–\s*8\.500/)).toBeTruthy()

    // Trocar para Aplicadas mostra o passado e oculta o aberto
    fireEvent.click(screen.getByRole('button', { name: /Aplicadas/ }))
    expect(
      await screen.findByRole('link', { name: /Governo de São Paulo/ }),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Prefeitura de Campinas/ })).toBeNull()
  })

  it('toggle de estado: contadores por aba e filtragem', async () => {
    mockList(
      makeConcursoList([
        makeConcursoListItem({ slug: 'a', status: 'open' }),
        makeConcursoListItem({ slug: 'b', status: 'open' }),
        makeConcursoListItem({ slug: 'c', institution: 'TJ', status: 'future' }),
        makeConcursoListItem({ slug: 'd', institution: 'Gov', status: 'past', city: null }),
      ]),
    )
    renderPage(LIST_PATH)

    // Botões do segmented com contador (acessível name = "Abertas2" etc.)
    expect(await screen.findByRole('button', { name: /Todas\s*4/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Abertas\s*2/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /A caminho\s*1/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Aplicadas\s*1/ })).toBeTruthy()

    // Padrão Abertas → 2; Todas → 4; Aplicadas → 1
    expect(screen.getAllByRole('link', { name: /Ver concurso/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Todas/ }))
    expect(screen.getAllByRole('link', { name: /Ver concurso/ })).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: /Aplicadas/ }))
    expect(screen.getAllByRole('link', { name: /Ver concurso/ })).toHaveLength(1)
  })

  it('pagina a lista plana com "Ver mais"', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeConcursoListItem({
        slug: `c-${i}`,
        institution: `Concurso ${i}`,
        status: 'open',
      }),
    )
    mockList(makeConcursoList(many))
    renderPage(LIST_PATH)

    let links = await screen.findAllByRole('link', { name: /Ver concurso/ })
    expect(links).toHaveLength(24) // PAGE_SIZE

    fireEvent.click(screen.getByRole('button', { name: /Ver mais/ }))
    links = screen.getAllByRole('link', { name: /Ver concurso/ })
    expect(links).toHaveLength(30)
  })

  it('filtra por busca (instituição/banca/cidade)', async () => {
    mockList(makeConcursoList())
    renderPage(LIST_PATH)
    await screen.findByRole('heading', { level: 1, name: 'Concursos' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar concursos' }), {
      target: { value: 'campinas' },
    })

    const links = screen.getAllByRole('link', { name: /Ver concurso/ })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('aria-label')).toBe(
      'Ver concurso Prefeitura de Campinas 2026',
    )
  })

  it('filtro de Estado filtra e revela Cidade em cascata', async () => {
    mockList(
      makeConcursoList([
        makeConcursoListItem({ slug: 'a', state: 'SP', city: 'Campinas', status: 'open' }),
        makeConcursoListItem({ slug: 'b', state: 'SP', city: 'Santos', status: 'open' }),
        makeConcursoListItem({
          slug: 'c',
          institution: 'Pref RJ',
          state: 'RJ',
          city: 'Niterói',
          status: 'open',
        }),
      ]),
    )
    renderPage(LIST_PATH)

    // Aguarda os dados (o dropdown de Estado só aparece após o fetch)
    const estadoBtn = await screen.findByRole('button', { name: /Estado/ })
    // Sem estado escolhido, Cidade nem existe
    expect(screen.queryByRole('button', { name: /Cidade/ })).toBeNull()

    // Abre Estado e escolhe SP → filtra para os 2 de SP
    fireEvent.click(estadoBtn)
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^SP/ }))
    expect(screen.getAllByRole('link', { name: /Ver concurso/ })).toHaveLength(2)

    // Cidade aparece (cascata) → escolher Campinas restringe a 1
    fireEvent.click(screen.getByRole('button', { name: /Cidade/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^Campinas/ }))
    expect(screen.getAllByRole('link', { name: /Ver concurso/ })).toHaveLength(1)
  })

  it('opção "Federais" filtra escopo federal e não mostra Cidade', async () => {
    mockList(
      makeConcursoList([
        makeConcursoListItem({ slug: 'a', state: 'SP', city: 'Campinas', status: 'open' }),
        makeConcursoListItem({
          slug: 'f',
          institution: 'UFRJ',
          state: null,
          city: null,
          governmentScope: 'FEDERAL',
          status: 'open',
        }),
      ]),
    )
    renderPage(LIST_PATH)

    fireEvent.click(await screen.findByRole('button', { name: /Estado/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Federais/ }))

    const links = screen.getAllByRole('link', { name: /Ver concurso/ })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('aria-label')).toContain('UFRJ')
    // Federal não tem cidade → o dropdown não aparece
    expect(screen.queryByRole('button', { name: /Cidade/ })).toBeNull()
  })

  it('busca sem match → estado vazio com limpar filtros', async () => {
    mockList(makeConcursoList())
    renderPage(LIST_PATH)
    await screen.findByRole('heading', { level: 1, name: 'Concursos' })

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar concursos' }), {
      target: { value: 'zzz-inexistente' },
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Nenhum concurso com esses filtros',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeTruthy()
  })

  it('lista vazia → estado vazio sem filtros', async () => {
    mockList(makeConcursoList([]))
    renderPage(LIST_PATH)

    expect(
      await screen.findByRole('heading', { name: 'Nenhum concurso disponível' }),
    ).toBeTruthy()
  })

  it('admin vê o atalho para gerenciar provas', async () => {
    mockList(makeConcursoList(), { user: { id: 'a', role: 'ADMIN' } })
    renderPage(LIST_PATH)

    const link = await screen.findByRole('link', { name: /Gerenciar provas/ })
    expect(link.getAttribute('href')).toBe('/exams')
  })

  it('skeleton acessível enquanto carrega', async () => {
    installFetchMock({ [API]: 'pending', [PROFILE]: { body: { user: null } } })
    renderPage(LIST_PATH)

    expect(
      await screen.findByRole('status', { name: 'Carregando concursos' }),
    ).toBeTruthy()
  })

  it('erro de rede → estado de falha com retry', async () => {
    installFetchMock({
      [API]: { status: 500, body: { message: 'boom' } },
      [PROFILE]: { body: { user: null } },
    })
    renderPage(LIST_PATH)

    expect(
      await screen.findByRole('heading', {
        name: 'Não foi possível carregar os concursos',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeTruthy()
  })

  it('não tem violações axe sérias/críticas', async () => {
    mockList(
      makeConcursoList([
        makeConcursoListItem(),
        makeConcursoListItem({
          slug: 'tj-2025',
          institution: 'Tribunal de Justiça',
          status: 'future',
          userStats: { attemptedCargos: 2, bestScore: 80 },
        }),
      ]),
    )
    const { container } = renderPage(LIST_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Concursos' })
    await expectNoSeriousAxeViolations(container)
  })
})
