/**
 * Tipos espelhando 1:1 os payloads da API de preferências:
 * - GET /preferences → PreferenceResponse
 * - PUT /preferences → PreferenceResponse (upsert de documento completo)
 *
 * O matching que o perfil alimenta chega pronto do backend no card da
 * listagem (`ConcursoListItem.match`) — nada é recomputado aqui.
 */

/**
 * Escopo da busca: orçamento de tempo de viagem a partir da cidade-âncora
 * (MAX_*), estado inteiro (STATE) ou Brasil todo (ANYWHERE = topa se mudar).
 */
export type PreferenceMobility =
  | 'MAX_30MIN'
  | 'MAX_1H'
  | 'MAX_2H'
  | 'STATE'
  | 'ANYWHERE'

/** v1: não filtra o matching — reservado para copy/elegibilidade futuras. */
export type CareerStage = 'STUDENT' | 'RECENT_GRAD' | 'COREN_REGISTERED'

export type ExamHorizon = 'ASAP' | 'LONG_TERM'

export type UserPreference = {
  /** UF (sigla, ex.: "SP"). Null apenas no escopo ANYWHERE. */
  state: string | null
  /** Cidade-âncora da busca (onde mora ou planeja morar). Null em STATE/ANYWHERE. */
  city: string | null
  mobility: PreferenceMobility
  careerStage: CareerStage
  /** Decimal serializado como string; null = sem restrição. */
  minSalary: string | null
  horizon: ExamHorizon
  updatedAt: string
}

export type PreferenceResponse = { preference: UserPreference | null }

/** Corpo do PUT — exatamente os campos do DTO (forbidNonWhitelisted). */
export type UpsertPreferenceInput = {
  /** Obrigatório exceto em ANYWHERE. */
  state?: string | null
  /** Obrigatório só nos escopos de raio (MAX_*). */
  city?: string | null
  mobility: PreferenceMobility
  careerStage: CareerStage
  minSalary?: number | null
  horizon: ExamHorizon
}
