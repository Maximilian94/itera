// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installFetchMock,
  makeConcursoList,
  makePreference,
  renderPage,
} from './page-test-utils'
import { resetTour } from '@/features/onboarding/tour-state'

// Tour NÃO visto → o walkthrough progressivo do Ato 1 fica ativo.
beforeEach(() => {
  resetTour()
})
afterEach(() => {
  // Desmonta o React (para o rAF do coach-mark) antes de limpar o DOM — senão
  // um tick roda após o teardown do jsdom (window undefined).
  cleanup()
  resetTour()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

/** Perfil preenchido + sem meta → Ato 1 automático (o coach vira walkthrough). */
function mockTour() {
  installFetchMock({
    '/concursos': { body: makeConcursoList() },
    '/auth/me': { body: { user: null } },
    '/preferences': { body: { preference: makePreference() } },
    '/goals': { body: { goals: [] } },
  })
}

const SEARCH = /Buscar por instituição/i

describe('walkthrough da lista (Ato 1)', () => {
  it('começa em branco; um coach-mark passa por preferências → filtros → lista', async () => {
    mockTour()
    renderPage('/concursos')

    // Tela 1: em branco (intro) — a página ainda não renderiza.
    expect(
      await screen.findByText(/hora de escolher o concurso para treinar/i),
    ).toBeTruthy()
    expect(screen.queryByPlaceholderText(SEARCH)).toBeNull()

    // Avançar → o coach-mark ancora nas preferências (card com o título).
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    expect(await screen.findByText('Suas preferências')).toBeTruthy()

    // Avançar → filtros.
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    expect(await screen.findByText('Busca e filtros')).toBeTruthy()

    // Avançar → lista.
    fireEvent.click(screen.getByRole('button', { name: /Avançar/ }))
    expect(await screen.findByText('Os concursos')).toBeTruthy()

    // Entendi! → o coach-mark some e a página fica interativa.
    fireEvent.click(screen.getByRole('button', { name: /Entendi/ }))
    await waitFor(() => expect(screen.queryByText('Os concursos')).toBeNull())
    expect(screen.getByPlaceholderText(SEARCH)).toBeTruthy()
  })

  it('"Pular o tour" na intro vai direto para a lista', async () => {
    mockTour()
    renderPage('/concursos')

    fireEvent.click(await screen.findByRole('button', { name: /Pular o tour/ }))
    expect(await screen.findByPlaceholderText(SEARCH)).toBeTruthy()
  })
})
