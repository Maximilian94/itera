import type {
  CargoDetail,
  CompetitionHistory,
  ConcursoDetail,
  SubjectDistribution,
} from '../domain/concurso.types'
import { apiFetch } from '@/lib/api'

class ConcursoService {
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
