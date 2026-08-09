import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { goalService } from '../services/goal.service'
import type { CreateGoalInput } from '../domain/goal.types'

/** Metas mudam por ação explícita do usuário — mesma janela dos treinos. */
const GOALS_STALE_TIME = 5 * 60 * 1000

export const goalKeys = {
  all: ['goals'] as const,
  list: () => [...goalKeys.all, 'list'] as const,
}

/** Metas ativas do usuário (o backend faz backfill lazy dos treinos em andamento). */
export function useGoalsQuery() {
  return useQuery({
    queryKey: goalKeys.list(),
    queryFn: () => goalService.list(),
    staleTime: GOALS_STALE_TIME,
  })
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

export function useArchiveGoalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}
