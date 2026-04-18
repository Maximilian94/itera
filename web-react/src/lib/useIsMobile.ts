import { useMediaQuery } from '@mui/material'

/**
 * Breakpoint único do app: viewport < 768px é mobile.
 * Alinhado ao `md` do Tailwind.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
