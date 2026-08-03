// @vitest-environment jsdom

/** PreferenceForm isolado: escopo ramifica os campos (cidade+raio / estado /
 *  Brasil), payload do submit e a regra "desabilitado até completar". */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
} from '@/features/concurso/__tests__/page-test-utils'
import { PreferenceForm } from '../components/PreferenceForm'
import {
  makeStateCityHandlers,
  fillStateCity,
  fillStateOnly,
} from './preference-test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function renderForm(onSubmit = vi.fn()) {
  installFetchMock(makeStateCityHandlers())
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PreferenceForm submitLabel="Ver meus concursos" onSubmit={onSubmit} />
    </QueryClientProvider>,
  )
  return { ...utils, onSubmit }
}

describe('PreferenceForm', () => {
  it('escopo cidade: submit desabilitado até completar; payload com âncora + raio', async () => {
    const { onSubmit, container } = renderForm()

    const submit = screen.getByRole('button', {
      name: 'Ver meus concursos',
    }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.click(screen.getByLabelText('Perto de uma cidade'))
    await fillStateCity()
    fireEvent.click(screen.getByLabelText('Até 1h de viagem'))
    fireEvent.click(screen.getByLabelText('Já tenho registro no COREN'))
    fireEvent.click(
      screen.getByLabelText('Quero fazer uma prova o quanto antes'),
    )
    fireEvent.change(screen.getByLabelText('Salário mínimo aceitável'), {
      target: { value: '3500' },
    })

    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      state: 'SP',
      city: 'Campinas',
      mobility: 'MAX_1H',
      careerStage: 'COREN_REGISTERED',
      minSalary: 3500,
      horizon: 'ASAP',
    })

    await expectNoSeriousAxeViolations(container)
  })

  it('escopo estado: só a UF entra na âncora (sem campo de cidade)', async () => {
    const { onSubmit } = renderForm()
    fireEvent.click(screen.getByLabelText('Em um estado inteiro'))
    expect(screen.queryByRole('combobox', { name: 'Cidade' })).toBeNull()

    await fillStateOnly()
    fireEvent.click(screen.getByLabelText('Já tenho registro no COREN'))
    fireEvent.click(
      screen.getByLabelText('Quero fazer uma prova o quanto antes'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus concursos' }))
    expect(onSubmit).toHaveBeenCalledWith({
      state: 'SP',
      mobility: 'STATE',
      careerStage: 'COREN_REGISTERED',
      minSalary: null,
      horizon: 'ASAP',
    })
  })

  it('escopo Brasil: sem âncora nenhuma; salário vazio vira null', async () => {
    const { onSubmit } = renderForm()
    fireEvent.click(screen.getByLabelText('Em qualquer lugar do Brasil'))
    expect(screen.queryByRole('combobox', { name: 'Estado' })).toBeNull()

    fireEvent.click(screen.getByLabelText('Ainda estou estudando'))
    fireEvent.click(screen.getByLabelText('Estou me preparando (1–2 anos)'))
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus concursos' }))
    expect(onSubmit).toHaveBeenCalledWith({
      mobility: 'ANYWHERE',
      careerStage: 'STUDENT',
      minSalary: null,
      horizon: 'LONG_TERM',
    })
  })
})
