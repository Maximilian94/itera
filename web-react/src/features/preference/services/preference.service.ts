import { apiFetch } from '@/lib/api'
import type {
  PreferenceResponse,
  UpsertPreferenceInput,
} from '../domain/preference.types'

const preferenceService = {
  get(): Promise<PreferenceResponse> {
    return apiFetch<PreferenceResponse>('/preferences', { method: 'GET' })
  },

  upsert(input: UpsertPreferenceInput): Promise<PreferenceResponse> {
    return apiFetch<PreferenceResponse>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
}

export { preferenceService }
