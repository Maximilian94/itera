import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preferenceService } from '../services/preference.service'
import type { UpsertPreferenceInput } from '../domain/preference.types'
import { concursoKeys } from '@/features/concurso/queries/concurso.queries'
import { ackReview } from '@/features/onboarding/tour-state'

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
      // Salvar o perfil conclui o Passo 1 do tour (auto ou manual) — assim a
      // revisão nunca reaparece logo após preencher/ajustar o radar.
      ackReview()
    },
  })
}
