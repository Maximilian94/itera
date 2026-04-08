import { apiFetch } from '@/lib/api'
import type { AdminUser } from '../domain/admin.types'

export const adminService = {
  listUsers(): Promise<AdminUser[]> {
    return apiFetch<AdminUser[]>('/admin/users', { method: 'GET' })
  },
}
