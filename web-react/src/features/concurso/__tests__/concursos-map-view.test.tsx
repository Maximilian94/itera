// @vitest-environment jsdom

/**
 * Visão Mapa da listagem (nível 0). Cobre o que é NOSSO — o toggle, o recorte
 * que chega ao mapa, os marcadores e a faixa off-map. O Leaflet em si roda de
 * verdade (jsdom aguenta: sem tiles, mas com DOM), então o que falha aqui é
 * integração real, não mock.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeConcursoListItem,
  makePreference,
  renderPage,
} from './page-test-utils'
import { ackListTour, resetTour } from '@/features/onboarding/tour-state'

/**
 * O Leaflet calcula tudo (bounds, quais marcadores cabem na viewport) a partir
 * do tamanho do container, e no jsdom todo elemento mede 0×0 — sem isto o mapa
 * monta mas não desenha um marcador sequer. Dar uma medida ao container é o que
 * permite testar o mapa DE VERDADE em vez de mockar o Leaflet inteiro.
 */
function giveElementsSize() {
  for (const [prop, value] of [
    ['clientWidth', 1024],
    ['clientHeight', 600],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      value,
    })
  }
}

beforeEach(() => {
  resetTour()
  ackListTour()
  giveElementsSize()
})

afterEach(() => {
  resetTour()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
  document.body.innerHTML = ''
})

const LIST_PATH = '/concursos'

function mockList(concursos: Array<unknown>) {
  installFetchMock({
    '/concursos': { body: { concursos } },
    '/auth/me': { body: { user: null } },
    '/preferences': { body: { preference: makePreference() } },
  })
}

/** Abre a visão Mapa pelo toggle e espera o chunk lazy do Leaflet montar. */
async function openMap() {
  fireEvent.click(await screen.findByRole('button', { name: 'Mapa' }))
  return waitFor(() => screen.getByRole('region', { name: /Mapa de concursos/ }))
}

describe('visão Mapa da listagem', () => {
  it('o toggle troca lista → mapa e volta', async () => {
    mockList([makeConcursoListItem()])
    renderPage(LIST_PATH)

    /* Começa na lista: o card existe, o mapa não. */
    expect(
      await screen.findByRole('link', {
        name: 'Ver concurso Prefeitura de Campinas 2026',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('region', { name: /Mapa de concursos/ })).toBeNull()

    await openMap()

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /Mapa de concursos/ }),
      ).toBeNull(),
    )
  })

  it('desenha um marcador por local, com a pílula legível', async () => {
    mockList([
      makeConcursoListItem(),
      makeConcursoListItem({
        id: 'c2',
        slug: 'pms-2026',
        institution: 'Prefeitura de Santos',
        city: 'Santos',
        coords: { lat: -23.9608, lng: -46.3336, precision: 'city' },
      }),
    ])
    renderPage(LIST_PATH)
    const map = await openMap()

    await waitFor(() => {
      expect(map.textContent).toContain('Prefeitura de Campinas')
      expect(map.textContent).toContain('Prefeitura de Santos')
    })
  })

  /* A razão de existir o agrupamento: mesma coordenada = marcadores empilhados
   * e o de baixo inalcançável. Vira um marcador com "+1". */
  it('concursos na mesma cidade viram um marcador com contador', async () => {
    mockList([
      makeConcursoListItem(),
      makeConcursoListItem({
        id: 'c2',
        slug: 'pmc-saude-2026',
        institution: 'Campinas Saúde',
      }),
    ])
    renderPage(LIST_PATH)
    const map = await openMap()

    await waitFor(() => expect(map.textContent).toContain('+1'))
  })

  it('concurso sem coordenada não some — vai para a faixa off-map', async () => {
    mockList([
      makeConcursoListItem(),
      makeConcursoListItem({
        id: 'c3',
        slug: 'ebserh-2026',
        institution: 'EBSERH',
        governmentScope: 'FEDERAL',
        state: null,
        city: null,
        coords: null,
      }),
    ])
    renderPage(LIST_PATH)
    await openMap()

    const offMap = await screen.findByRole('region', {
      name: 'Concursos sem localização no mapa',
    })
    expect(offMap.textContent).toContain('EBSERH')
    expect(offMap.textContent).toContain('Nacionais e sem local definido (1)')
  })

  it('seleção sem nenhum local mapeável explica o vazio', async () => {
    mockList([
      makeConcursoListItem({
        governmentScope: 'FEDERAL',
        state: null,
        city: null,
        coords: null,
      }),
    ])
    renderPage(LIST_PATH)
    const map = await openMap()

    await waitFor(() =>
      expect(map.textContent).toContain(
        'Nenhum concurso com local definido nesta seleção',
      ),
    )
  })

  it('o mapa respeita os filtros da toolbar (mesma seleção da lista)', async () => {
    mockList([
      makeConcursoListItem(),
      makeConcursoListItem({
        id: 'c2',
        slug: 'pms-2026',
        institution: 'Prefeitura de Santos',
        city: 'Santos',
        coords: { lat: -23.9608, lng: -46.3336, precision: 'city' },
      }),
    ])
    renderPage(LIST_PATH)
    /* Esperar a página montar antes de mexer na toolbar. */
    await screen.findByRole('heading', { level: 1, name: 'Concursos' })

    fireEvent.change(screen.getByLabelText('Buscar concursos'), {
      target: { value: 'Santos' },
    })
    const map = await openMap()

    await waitFor(() => {
      expect(map.textContent).toContain('Prefeitura de Santos')
      expect(map.textContent).not.toContain('Prefeitura de Campinas')
    })
  })

  it('sem violações sérias de acessibilidade', async () => {
    mockList([makeConcursoListItem()])
    const { container } = renderPage(LIST_PATH)
    await openMap()
    await expectNoSeriousAxeViolations(container)
  })
})
