import { apiFetch } from '@/lib/api'

export type Profile = {
  id: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'USER'
}

export type ProfileResponse = { user: Profile | null }

const authService = {
  getProfile(): Promise<ProfileResponse> {
    return apiFetch<ProfileResponse>('/auth/me', { method: 'GET' })
  },

  updatePhone(phone: string | null): Promise<ProfileResponse> {
    return apiFetch<ProfileResponse>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ phone: phone ?? null }),
    })
  },
}

export { authService }
