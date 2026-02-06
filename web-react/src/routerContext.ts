import type { useClerkAuth } from '@/auth/clerk'

export interface RouterContext {
  auth: ReturnType<typeof useClerkAuth>
}
