import { apiFetch } from '@/lib/api'
import type {
  CreateGoalInput,
  GoalsResponse,
  UserGoal,
} from '../domain/goal.types'

const goalService = {
  list(): Promise<GoalsResponse> {
    return apiFetch<GoalsResponse>('/goals', { method: 'GET' })
  },

  create(input: CreateGoalInput): Promise<{ goal: UserGoal }> {
    return apiFetch<{ goal: UserGoal }>('/goals', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  /** "Parar de treinar" — arquiva a meta (histórico preservado no backend). */
  archive(id: string): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>(`/goals/${id}`, { method: 'DELETE' })
  },
}

export { goalService }
