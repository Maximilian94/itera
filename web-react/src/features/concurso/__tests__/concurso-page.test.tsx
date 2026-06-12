// @vitest-environment jsdom

/** Página do concurso (nível 1): payload mockado, estados e axe (MAX-26). */
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeCargoSummary,
  makeConcursoDetail,
  renderPage,
} from './page-test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const CONCURSO_PATH = '/concursos/pmc-2026'
const API = '/concursos/pmc-2026'

describe('página do concurso (nível 1)', () => {
  it('renderiza cabeçalho, ficha e cards de cargo a partir do payload', async () => {
    installFetchMock({ [API]: { body: makeConcursoDetail() } })
    renderPage(CONCURSO_PATH)

    // Cabeçalho com pill de status determinística (sem datas relativas)
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Concurso Prefeitura de Campinas 2026',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Inscrições abertas')).toBeTruthy()

    // Um card por cargo, ordenação do payload preservada
    const links = screen.getAllByRole('link', { name: /Ver detalhes do cargo/ })
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Ver detalhes do cargo Enfermeiro',
      'Ver detalhes do cargo Técnico de Enfermagem',
    ])
    expect(links[0].getAttribute('href')).toBe('/concursos/pmc-2026/enfermeiro')

    // Cargo com tentativas → leitura de prontidão contra o corte
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('Acima do corte')).toBeTruthy()
    // Cargo sem tentativas → convite para começar
    expect(
      screen.getByText('Você ainda não treinou para este cargo'),
    ).toBeTruthy()

    // Ficha do concurso na sidebar
    expect(screen.getByText('Ficha do concurso')).toBeTruthy()
    expect(screen.getByText('Banca')).toBeTruthy()
    expect(
      screen.getByText('VUNESP · 12 vagas de enfermagem + CR · Campinas / SP'),
    ).toBeTruthy()
  })

  it('mostra skeleton acessível enquanto o payload não chega', async () => {
    installFetchMock({ [API]: 'pending' })
    renderPage(CONCURSO_PATH)

    expect(
      await screen.findByRole('status', { name: 'Carregando concurso' }),
    ).toBeTruthy()
  })

  it('404 → estado de não encontrado com volta para /exams', async () => {
    installFetchMock({ [API]: { status: 404, body: { message: 'Not found' } } })
    renderPage(CONCURSO_PATH)

    expect(
      await screen.findByRole('heading', { name: 'Concurso não encontrado' }),
    ).toBeTruthy()
    // 404 não oferece retry — o recurso não existe
    expect(
      screen.queryByRole('button', { name: /Tentar novamente/ }),
    ).toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Ver todos os concursos' })
        .getAttribute('href'),
    ).toBe('/exams')
  })

  it('erro de rede → estado de falha com retry', async () => {
    installFetchMock({ [API]: { status: 500, body: { message: 'boom' } } })
    renderPage(CONCURSO_PATH)

    expect(
      await screen.findByRole('heading', {
        name: 'Não foi possível carregar o concurso',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Tentar novamente/ }),
    ).toBeTruthy()
  })

  it('concurso sem cargos → estado vazio com rota de fuga', async () => {
    installFetchMock({ [API]: { body: makeConcursoDetail({ cargos: [] }) } })
    renderPage(CONCURSO_PATH)

    expect(
      await screen.findByRole('heading', {
        name: 'Ainda não temos as provas deste concurso',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Ver outros concursos/ }),
    ).toBeTruthy()
  })

  it('cargo sem questões e sem nota → card navega mas não inicia simulado', async () => {
    installFetchMock({
      [API]: {
        body: makeConcursoDetail({
          cargos: [
            makeCargoSummary({
              questionCount: 0,
              userStats: { attemptCount: 0, bestScore: null },
            }),
          ],
        }),
      },
    })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })
    const card = screen
      .getByRole('link', { name: 'Ver detalhes do cargo Enfermeiro' })
      .closest('article')!
    // Sem prova treinável, "Começar" é só affordance visual (sem botão real)
    expect(within(card).queryByRole('button', { name: /Começar/ })).toBeNull()
    expect(within(card).getByText('Começar')).toBeTruthy()
  })

  it('não tem violações axe sérias/críticas', async () => {
    installFetchMock({ [API]: { body: makeConcursoDetail() } })
    const { container } = renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })
    await expectNoSeriousAxeViolations(container)
  })
})
