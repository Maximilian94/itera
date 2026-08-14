// @vitest-environment jsdom

/** Gate de preferências + seções "Recomendados para você" na listagem
 *  (nível 0): perfil obrigatório, fail-open, chips de motivo e edição. */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeConcursoList,
  makeConcursoListItem,
  makePreference,
  renderPage
} from './page-test-utils'
import type {FetchHandler} from './page-test-utils';
import {
  fillStateCity,
  makeStateCityHandlers,
} from '@/features/preference/__tests__/preference-test-utils'
import { ackListTour, resetTour } from '@/features/onboarding/tour-state'

// Estes testes exercitam gate/preferências, não o walkthrough progressivo da
// lista: marcamos ele como já visto para que a lista apareça após salvar.
beforeEach(() => {
  resetTour()
  ackListTour()
})

afterEach(() => {
  resetTour()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const LIST_PATH = '/concursos'

function mockPage({
  preferences,
  list = makeConcursoList(),
}: {
  preferences: FetchHandler
  list?: unknown
}) {
  installFetchMock({
    '/concursos': { body: list },
    '/auth/me': { body: { user: null } },
    '/preferences': preferences,
    ...makeStateCityHandlers(),
  })
}

describe('gate de preferências', () => {
  it('sem perfil: o wizard toma a página (header/filtros/toggle ausentes)', async () => {
    mockPage({ preferences: { body: { preference: null } } })
    const { container } = renderPage(LIST_PATH)

    // Wizard em tela cheia: 1ª pergunta + progresso visível.
    expect(
      await screen.findByRole('heading', { name: 'Onde você busca concursos?' }),
    ).toBeTruthy()
    expect(screen.getByText('1 de 6')).toBeTruthy()
    // O chrome da lista sai de cena — inclusive o header "Concursos".
    expect(screen.queryByRole('heading', { name: 'Concursos' })).toBeNull()
    expect(screen.queryByLabelText('Buscar concursos')).toBeNull()
    expect(screen.queryByRole('button', { name: /Abertas/ })).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Ver concurso/ }),
    ).toBeNull()

    await expectNoSeriousAxeViolations(container)
  })

  it('preencher e salvar destrava a lista', async () => {
    /* O mock por pathname é method-agnóstico; aqui o GET devolve null e o PUT
     * devolve o perfil salvo — stub próprio, method-aware. */
    const saved = { preference: makePreference() }
    installFetchMock({
      '/concursos': { body: makeConcursoList() },
      '/auth/me': { body: { user: null } },
      ...makeStateCityHandlers(),
    })
    const base = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url
        if (new URL(url).pathname === '/preferences') {
          const body = init?.method === 'PUT' ? saved : { preference: null }
          return {
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(JSON.stringify(body)),
          }
        }
        return base(input as never, init)
      }),
    )

    renderPage(LIST_PATH)
    await screen.findByRole('heading', { name: 'Onde você busca concursos?' })

    // Wizard: escopo → cidade-âncora → raio → carreira → horizonte → salário.
    // (a opção de escopo carrega descrição no rótulo → matcher por regex)
    fireEvent.click(screen.getByRole('radio', { name: /Perto de uma cidade/ }))
    await fillStateCity()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    fireEvent.click(await screen.findByLabelText('Até 1h de viagem'))
    // Escolher avança sozinho para a próxima pergunta.
    fireEvent.click(
      await screen.findByLabelText('Já tenho registro no COREN'),
    )
    fireEvent.click(
      await screen.findByLabelText('Quero fazer uma prova o quanto antes'),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ver meus concursos' }),
    )

    // Mutation salva → setQueryData destrava → a lista aparece.
    expect(
      await screen.findByRole('link', {
        name: 'Ver concurso Prefeitura de Campinas 2026',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Onde você busca concursos?' })).toBeNull()
  })

  it('erro na query de preferências → fail-open (lista normal, sem gate)', async () => {
    mockPage({
      preferences: { status: 500, body: { message: 'boom' } },
    })
    renderPage(LIST_PATH)

    expect(
      await screen.findByRole('link', {
        name: 'Ver concurso Prefeitura de Campinas 2026',
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Onde você busca concursos?' })).toBeNull()
  })
})

describe('seções por match', () => {
  const recommendedItem = makeConcursoListItem({
    slug: 'rec',
    institution: 'Prefeitura de Campinas',
    match: {
      recommended: true,
      reasons: ['NEARBY', 'SALARY', 'REGISTRATION_OPEN'],
      travelMinutes: 40,
    },
  })
  const otherItem = makeConcursoListItem({
    slug: 'other',
    institution: 'Prefeitura de Sorocaba',
    city: 'Sorocaba',
    match: { recommended: false, reasons: [] },
  })

  it('divide a aba em "Recomendados para você" + "Outros concursos", com chips de motivo', async () => {
    mockPage({
      preferences: { body: { preference: makePreference() } },
      list: makeConcursoList([recommendedItem, otherItem]),
    })
    const { container } = renderPage(LIST_PATH)

    expect(
      await screen.findByRole('heading', { name: 'Recomendados para você' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Outros concursos' }),
    ).toBeTruthy()

    // Chips do porquê no card recomendado (NEARBY carrega o tempo estimado).
    expect(screen.getByText('A ~40 min de você')).toBeTruthy()
    expect(screen.getByText('Salário dentro do que você busca')).toBeTruthy()
    expect(screen.getByText('Inscrições abertas')).toBeTruthy()

    // Recomendado vem antes na ordem do DOM.
    const links = screen.getAllByRole('link', { name: /Ver concurso/ })
    expect(links[0].getAttribute('href')).toBe('/concursos/rec')

    await expectNoSeriousAxeViolations(container)
  })

  it('sem recomendados na aba → lista plana, sem headings de seção', async () => {
    mockPage({
      preferences: { body: { preference: makePreference() } },
      list: makeConcursoList([otherItem]),
    })
    renderPage(LIST_PATH)

    await screen.findByRole('link', { name: /Ver concurso/ })
    expect(
      screen.queryByRole('heading', { name: 'Recomendados para você' }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Outros concursos' }),
    ).toBeNull()
  })
})

describe('barra de preferências', () => {
  it('mostra os chips do perfil e "Editar" abre o dialog com o form', async () => {
    mockPage({
      preferences: { body: { preference: makePreference() } },
    })
    renderPage(LIST_PATH)

    // Chips-resumo do perfil ("Campinas/SP" também aparece no card → All).
    expect((await screen.findAllByText(/Campinas\/SP/)).length).toBeGreaterThan(0)
    expect(screen.getByText(/R\$\s*3\.000/)).toBeTruthy()
    expect(screen.getByText('Prova o quanto antes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))
    await waitFor(() =>
      expect(screen.getByText('Suas preferências')).toBeTruthy(),
    )
    // Form pré-preenchido: salvar já habilitado.
    const save = screen.getByRole('button', { name: 'Salvar' })
    expect(save.disabled).toBe(false)

    // Fecha o dialog antes do teardown (a transição do MUI agenda timers que
    // estourariam depois do ambiente destruído — fonte de flakiness).
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(screen.queryByText('Suas preferências')).toBeNull(),
    )
  })
})
