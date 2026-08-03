import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preferenceService } from '../services/preference.service'
import { concursoKeys } from '@/features/concurso/queries/concurso.queries'
import type { UpsertPreferenceInput } from '../domain/preference.types'

/** Perfil muda raramente — 5 min sem refetch (mesma janela dos concursos). */
const PREFERENCE_STALE_TIME = 5 * 60 * 1000

export const preferenceKeys = {
  me: ['auth', 'preferences'] as const,
}

/** Perfil de preferências do usuário logado; `preference: null` = gate. */
export function usePreferenceQuery() {
  return useQuery({
    queryKey: preferenceKeys.me,
    queryFn: () => preferenceService.get(),
    staleTime: PREFERENCE_STALE_TIME,
  })
}

export function useUpsertPreferenceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertPreferenceInput) =>
      preferenceService.upsert(input),
    onSuccess: (data) => {
      queryClient.setQueryData(preferenceKeys.me, data)
      // A listagem refetcha já anotada com o novo `match`.
      queryClient.invalidateQueries({ queryKey: concursoKeys.all })
    },
  })
}
