import { useQuery } from '@tanstack/react-query'
import { examBaseService } from '../services/examBase.service'

export const examBaseKeys = {
  examBases: ['examBases'] as const,
  list: (examBoardId?: string) => ['examBases', examBoardId ?? 'all'] as const,
}

export function useExamBaseQueries(input?: { examBoardId?: string }) {
  return useQuery({
    queryKey: examBaseKeys.list(input?.examBoardId),
    queryFn: () => examBaseService.list(input),
    enabled: true,
  })
}

