import { useQuery } from '@tanstack/react-query'
import { adminService } from '../services/admin.service'

export const adminKeys = {
  users: () => ['admin', 'users'] as const,
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => adminService.listUsers(),
  })
}
