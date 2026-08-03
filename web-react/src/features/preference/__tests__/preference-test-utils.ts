import { fireEvent, screen } from '@testing-library/react'
import type { FetchHandler } from '@/features/concurso/__tests__/page-test-utils'

/** Handlers dos endpoints do IBGE que o StateCitySelect consome (o mock do
 *  harness casa por pathname, independente do host). */
export function makeStateCityHandlers(): Record<string, FetchHandler> {
  return {
    '/api/v1/localidades/estados': {
      body: [
        {
          id: 35,
          sigla: 'SP',
          nome: 'São Paulo',
          regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' },
        },
      ],
    },
    '/api/v1/localidades/estados/35/municipios': {
      body: [{ id: 3509502, nome: 'Campinas' }],
    },
  }
}

/** Seleciona SP no Autocomplete de Estado (abre com ArrowDown). */
export async function fillStateOnly() {
  const estado = await screen.findByRole('combobox', { name: 'Estado' })
  fireEvent.keyDown(estado, { key: 'ArrowDown' })
  fireEvent.click(await screen.findByText('SP - São Paulo'))
}

/** Seleciona SP → Campinas nos Autocompletes MUI (abre com ArrowDown). */
export async function fillStateCity() {
  await fillStateOnly()

  const cidade = await screen.findByRole('combobox', { name: 'Cidade' })
  fireEvent.keyDown(cidade, { key: 'ArrowDown' })
  fireEvent.click(await screen.findByText('Campinas'))
}
