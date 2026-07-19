import type { AdminUser } from '../domain/admin.types'
import { apiFetch } from '@/lib/api'

export const adminService = {
  listUsers(): Promise<Array<AdminUser>> {
    return apiFetch<Array<AdminUser>>('/admin/users', { method: 'GET' })
  },
}
