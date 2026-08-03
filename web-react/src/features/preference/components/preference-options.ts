import type {
  CareerStage,
  ExamHorizon,
  PreferenceMobility,
} from '../domain/preference.types'

/** Vocabulário único das respostas — compartilhado entre o wizard do gate e o
 *  form direto do dialog de edição (mesmas opções, composições diferentes). */

/** Escopo da busca — a 1ª pergunta; cidade/raio só existem no escopo CITY. */
export type SearchScope = 'CITY' | 'STATE' | 'ANYWHERE'

export const SCOPE_OPTIONS: Array<{
  value: SearchScope
  label: string
  description: string
}> = [
  {
    value: 'CITY',
    label: 'Perto de uma cidade',
    description: 'Escolho a cidade e até quanto tempo de viagem eu topo',
  },
  {
    value: 'STATE',
    label: 'Em um estado inteiro',
    description: 'Qualquer cidade do estado que eu escolher',
  },
  {
    value: 'ANYWHERE',
    label: 'Em qualquer lugar do Brasil',
    description: 'Topo me mudar pela vaga certa',
  },
]

/** Raio de viagem — só para o escopo CITY. */
export const RADIUS_OPTIONS: Array<{
  value: Extract<PreferenceMobility, 'MAX_30MIN' | 'MAX_1H' | 'MAX_2H'>
  label: string
}> = [
  { value: 'MAX_30MIN', label: 'Até 30 min de viagem' },
  { value: 'MAX_1H', label: 'Até 1h de viagem' },
  { value: 'MAX_2H', label: 'Até 2h de viagem' },
]

/** Escopo implícito no mobility persistido (MAX_* = ancorado em cidade). */
export function scopeOfMobility(mobility: PreferenceMobility): SearchScope {
  if (mobility === 'STATE') return 'STATE'
  if (mobility === 'ANYWHERE') return 'ANYWHERE'
  return 'CITY'
}

export const CAREER_OPTIONS: Array<{ value: CareerStage; label: string }> = [
  { value: 'STUDENT', label: 'Ainda estou estudando' },
  { value: 'RECENT_GRAD', label: 'Recém-formado(a)' },
  { value: 'COREN_REGISTERED', label: 'Já tenho registro no COREN' },
]

export const HORIZON_OPTIONS: Array<{ value: ExamHorizon; label: string }> = [
  { value: 'ASAP', label: 'Quero fazer uma prova o quanto antes' },
  { value: 'LONG_TERM', label: 'Estou me preparando (1–2 anos)' },
]
