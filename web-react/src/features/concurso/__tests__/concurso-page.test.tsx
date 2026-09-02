// @vitest-environment jsdom

/** Página do concurso (nível 1): payload mockado, estados e axe (MAX-26). */
import { fireEvent, screen, within } from '@testing-library/react'
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
/** Busca do link oficial na aba Admin — `c1` é o id do concurso do factory. */
const FIND_LINK = '/admin/scraper/concursos/c1/find-link'
const SOURCE_URL = '/admin/scraper/concursos/c1/source-url'

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

    // Ficha do concurso na sidebar concentra banca, vagas e cidade.
    expect(screen.getByText('Ficha do concurso')).toBeTruthy()
    expect(screen.getByText('Banca')).toBeTruthy()
    expect(screen.getByText('VUNESP')).toBeTruthy()
    expect(screen.getByText('12 + cadastro reserva')).toBeTruthy()
    expect(screen.getByText('Campinas / SP')).toBeTruthy()

    // Cronograma: as etapas datadas do edital viram os passos da timeline.
    expect(screen.getByText('Cronograma')).toBeTruthy()
    expect(screen.getByText('Prova Objetiva')).toBeTruthy()
    expect(
      screen.getByText('Caráter eliminatório e classificatório.'),
    ).toBeTruthy()
    expect(screen.getByText('Prova de Títulos')).toBeTruthy()
  })

  it('aba Admin só existe para ADMIN e procura o link oficial do concurso', async () => {
    installFetchMock({
      [API]: {
        body: makeConcursoDetail({ concurso: { documentsSourceUrl: null } }),
      },
      '/auth/me': { body: { user: { role: 'ADMIN' } } },
      [FIND_LINK]: {
        body: {
          found: true,
          url: 'https://banca.org.br/pmc-2026',
          verified: true,
          docCount: 4,
          previousUrl: null,
          suggestion: null,
          cost: {
            usd: 0.0184,
            entries: [
              {
                label: 'leitura de página (IA)',
                model: 'gpt-4.1-mini',
                inputTokens: 6700,
                outputTokens: 300,
                usd: 0.0032,
              },
            ],
          },
        },
      },
    })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })

    fireEvent.click(await screen.findByRole('tab', { name: 'Admin' }))
    expect(screen.getByText('Origem dos documentos')).toBeTruthy()
    // Sem link salvo, o aviso explica a consequência para a aba Notícias.
    expect(screen.getByText(/Sem link/)).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: /Procurar link oficial/ }),
    )

    // Link confirmado (a página foi lida e lista documentos).
    expect(await screen.findByText(/Link confirmado/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /banca\.org\.br\/pmc-2026/ }),
    ).toBeTruthy()
    // Custo da busca visível na hora (o admin não espera o painel da OpenAI).
    expect(
      screen.getByRole('button', { name: /Custo: US\$ 0,0184/ }),
    ).toBeTruthy()
  })

  it('aba Admin deixa colar o link na mão quando a busca erra', async () => {
    installFetchMock({
      [API]: {
        body: makeConcursoDetail({ concurso: { documentsSourceUrl: null } }),
      },
      '/auth/me': { body: { user: { role: 'ADMIN' } } },
      [SOURCE_URL]: {
        body: { id: 'c1', documentsSourceUrl: 'https://banca.org.br/mondai' },
      },
    })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })
    fireEvent.click(await screen.findByRole('tab', { name: 'Admin' }))

    // Sem link salvo, o campo já vem aberto — é a saída, não um plano B oculto.
    const input = screen.getByLabelText('Link da página de documentos')
    fireEvent.change(input, {
      target: { value: 'https://banca.org.br/mondai' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Link atualizado.')).toBeTruthy()
  })

  it('candidato não verificado NÃO é salvo — o admin usa ou descarta', async () => {
    installFetchMock({
      [API]: {
        body: makeConcursoDetail({ concurso: { documentsSourceUrl: null } }),
      },
      '/auth/me': { body: { user: { role: 'ADMIN' } } },
      [FIND_LINK]: {
        body: {
          found: false,
          url: null,
          verified: false,
          docCount: 0,
          previousUrl: null,
          suggestion: {
            url: 'https://ameosc.selecao.net.br/informacoes/2543/',
            origin: 'busca web',
          },
          cost: { usd: 0.03, entries: [] },
        },
      },
      [SOURCE_URL]: {
        body: {
          id: 'c1',
          documentsSourceUrl: 'https://ameosc.selecao.net.br/informacoes/2543/',
        },
      },
    })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })
    fireEvent.click(await screen.findByRole('tab', { name: 'Admin' }))
    fireEvent.click(
      screen.getByRole('button', { name: /Procurar link oficial/ }),
    )

    // Deixa claro que nada foi gravado e entrega a decisão ao admin.
    expect(await screen.findByText(/não consegui verificar/i)).toBeTruthy()
    expect(screen.getByText(/Nada foi salvo/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /ameosc\.selecao\.net\.br/ }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Usar este link' }))
    expect(await screen.findByText('Link salvo.')).toBeTruthy()
  })

  it('sem ser ADMIN a aba Admin não é renderizada', async () => {
    installFetchMock({
      [API]: { body: makeConcursoDetail() },
      '/auth/me': { body: { user: { role: 'USER' } } },
    })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })
    expect(screen.queryByRole('tab', { name: 'Admin' })).toBeNull()
  })

  it('aba Notícias mostra a timeline de documentos, mais recente primeiro', async () => {
    installFetchMock({ [API]: { body: makeConcursoDetail() } })
    renderPage(CONCURSO_PATH)

    await screen.findByRole('heading', { level: 1, name: /Concurso/ })

    // Começa na aba Cargos: a timeline não está montada.
    expect(screen.queryByText('Notícias do concurso')).toBeNull()

    // Troca para Notícias.
    fireEvent.click(screen.getByRole('tab', { name: /Notícias/ }))

    // Timeline com os dois documentos do payload, edital + retificação.
    expect(screen.getByText('Notícias do concurso')).toBeTruthy()
    const edital = screen.getByRole('link', {
      name: /Edital de Abertura nº 01\/2026/,
    })
    expect(edital.getAttribute('href')).toBe(
      'https://example.com/edital-01.pdf',
    )
    expect(
      screen.getByText('Prorroga as inscrições e ajusta o cronograma.'),
    ).toBeTruthy()

    // Ordem: retificação (20/06) antes do edital (01/06) — payload já ordenado.
    const titles = screen
      .getAllByRole('link')
      .map((l) => l.textContent)
      .filter((t) => /Retificação|Edital de Abertura/.test(t))
    expect(titles[0]).toContain('Retificação')
    expect(titles[1]).toContain('Edital de Abertura')

    // Ao trocar de aba, os cards de cargo saem de cena.
    expect(
      screen.queryByRole('link', { name: 'Ver detalhes do cargo Enfermeiro' }),
    ).toBeNull()
  })

  it('mostra skeleton acessível enquanto o payload não chega', async () => {
    installFetchMock({ [API]: 'pending' })
    renderPage(CONCURSO_PATH)

    expect(
      await screen.findByRole('status', { name: 'Carregando concurso' }),
    ).toBeTruthy()
  })

  it('404 → estado de não encontrado com volta para /concursos', async () => {
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
    ).toBe('/concursos')
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
