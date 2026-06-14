import { useQuery } from '@tanstack/react-query'
import type { ConcursoListFilters } from '../domain/concurso.types'
import { concursoService } from '../services/concurso.service'

/** Dados de edital mudam raramente — 5 min sem refetch. */
const CONCURSO_STALE_TIME = 5 * 60 * 1000

export const concursoKeys = {
  all: ['concurso'] as const,
  list: (filters: ConcursoListFilters) => ['concurso', 'list', filters] as const,
  one: (slug: string) => ['concurso', slug] as const,
  cargo: (slug: string, cargoSlug: string) =>
    ['concurso', slug, 'cargo', cargoSlug] as const,
  subjectDistribution: (examBaseId: string) =>
    ['concurso', 'subject-distribution', examBaseId] as const,
  competitionHistory: (examBaseId: string) =>
    ['concurso', 'competition-history', examBaseId] as const,
}

/** Listagem/descoberta de concursos (nível 0). Filtros vão para o backend. */
export function useConcursosQuery(filters: ConcursoListFilters = {}) {
  return useQuery({
    queryKey: concursoKeys.list(filters),
    queryFn: () => concursoService.list(filters),
    staleTime: CONCURSO_STALE_TIME,
  })
}

/** Página do concurso (nível 1). */
export function useConcursoQuery(slug: string | undefined) {
  return useQuery({
    queryKey: concursoKeys.one(slug ?? ''),
    queryFn: () => concursoService.getConcurso(slug!),
    enabled: Boolean(slug),
    staleTime: CONCURSO_STALE_TIME,
  })
}

/** Página do cargo (nível 2). */
export function useCargoQuery(
  concursoSlug: string | undefined,
  cargoSlug: string | undefined,
) {
  return useQuery({
    queryKey: concursoKeys.cargo(concursoSlug ?? '', cargoSlug ?? ''),
    queryFn: () => concursoService.getCargo(concursoSlug!, cargoSlug!),
    enabled: Boolean(concursoSlug) && Boolean(cargoSlug),
    staleTime: CONCURSO_STALE_TIME,
  })
}

/** Distribuição por matéria do cargo (bloco do nível 2). */
export function useSubjectDistributionQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: concursoKeys.subjectDistribution(examBaseId ?? ''),
    queryFn: () => concursoService.getSubjectDistribution(examBaseId!),
    enabled: Boolean(examBaseId),
    staleTime: CONCURSO_STALE_TIME,
  })
}

/** Concorrência histórica do cargo (bloco do nível 2). */
export function useCompetitionHistoryQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: concursoKeys.competitionHistory(examBaseId ?? ''),
    queryFn: () => concursoService.getCompetitionHistory(examBaseId!),
    enabled: Boolean(examBaseId),
    staleTime: CONCURSO_STALE_TIME,
  })
}
