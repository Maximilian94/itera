/**
 * IBGE API - Estados e Municípios do Brasil
 * https://servicodados.ibge.gov.br/api/docs/localidades
 */

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

export type IbgeEstado = {
  id: number
  sigla: string
  nome: string
  regiao: { id: number; sigla: string; nome: string }
}

export type IbgeMunicipio = {
  id: number
  nome: string
  microrregiao: { id: number; nome: string }
  mesorregiao: { id: number; nome: string }
  'regiao-imediata': { id: number; nome: string }
  'regiao-intermediaria': { id: number; nome: string }
  uf: { id: number; sigla: string; nome: string }
}

export async function fetchEstados(): Promise<IbgeEstado[]> {
  const res = await fetch(`${IBGE_BASE}/estados?orderBy=nome`)
  if (!res.ok) throw new Error('Falha ao carregar estados')
  const data: IbgeEstado[] = await res.json()
  return data
}

export async function fetchMunicipiosPorEstado(
  estadoId: number,
): Promise<IbgeMunicipio[]> {
  const res = await fetch(
    `${IBGE_BASE}/estados/${estadoId}/municipios?orderBy=nome`,
  )
  if (!res.ok) throw new Error('Falha ao carregar municípios')
  const data: IbgeMunicipio[] = await res.json()
  return data
}
