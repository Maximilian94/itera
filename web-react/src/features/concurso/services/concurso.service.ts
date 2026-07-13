import type {
  CargoDetail,
  CompetitionHistory,
  ConcursoDetail,
  ConcursoListFilters,
  ConcursoListResponse,
  SubjectDistribution,
} from '../domain/concurso.types'
import { apiFetch } from '@/lib/api'

class ConcursoService {
  /** Listagem/descoberta (nível 0). Filtros viram query string. */
  async list(filters: ConcursoListFilters = {}) {
    const params = new URLSearchParams()
    if (filters.q?.trim()) params.set('q', filters.q.trim())
    if (filters.scope) params.set('scope', filters.scope)
    if (filters.state) params.set('state', filters.state)
    if (filters.city) params.set('city', filters.city)
    if (filters.examBoardId) params.set('examBoardId', filters.examBoardId)
    if (filters.status) params.set('status', filters.status)
    const qs = params.toString()
    return await apiFetch<ConcursoListResponse>(
      `/concursos${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    )
  }

  /** Página do concurso (nível 1). `slug` aceita UUID. */
  async getConcurso(slug: string) {
    return await apiFetch<ConcursoDetail>(
      `/concursos/${encodeURIComponent(slug)}`,
      { method: 'GET' },
    )
  }

  /** Página do cargo (nível 2). `cargoSlug` = ExamBase.slug; ambos aceitam UUID. */
  async getCargo(concursoSlug: string, cargoSlug: string) {
    return await apiFetch<CargoDetail>(
      `/concursos/${encodeURIComponent(concursoSlug)}/cargos/${encodeURIComponent(cargoSlug)}`,
      { method: 'GET' },
    )
  }

  /** Distribuição por matéria da prova (actual/historical decidido no backend). */
  async getSubjectDistribution(examBaseId: string) {
    return await apiFetch<SubjectDistribution>(
      `/exam-bases/${examBaseId}/subject-distribution`,
      { method: 'GET' },
    )
  }

  /** Concorrência histórica do cargo; `editions: []` esconde a seção. */
  async getCompetitionHistory(examBaseId: string) {
    return await apiFetch<CompetitionHistory>(
      `/exam-bases/${examBaseId}/competition-history`,
      { method: 'GET' },
    )
  }
}

export const concursoService = new ConcursoService()
