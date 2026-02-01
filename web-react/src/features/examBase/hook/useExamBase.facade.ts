import { useMemo } from 'react'
import { useExamBaseQueries } from '../queries/examBase.queries'

export function useExamBaseFacade(input?: { examBoardId?: string }) {
  const { data: examBases, isLoading: isLoadingExamBases } = useExamBaseQueries(input ?? {})

  return useMemo(() => {
    return {
      examBases,
      isLoadingExamBases,
    }
  }, [examBases, isLoadingExamBases])
}

