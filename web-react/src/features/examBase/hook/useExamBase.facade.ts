import { useMemo } from 'react'
import { useExamBaseQueries } from '../queries/examBase.queries'

export function useExamBaseFacade() {
  const { data: examBases, isLoading: isLoadingExamBases } = useExamBaseQueries()

  return useMemo(() => {
    return {
      examBases,
      isLoadingExamBases,
    }
  }, [examBases, isLoadingExamBases])
}

