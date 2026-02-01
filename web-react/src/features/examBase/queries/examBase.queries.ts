import { useQuery } from '@tanstack/react-query'
import { examBaseService } from '../services/examBase.service'

export const examBaseKeys = {
  examBases: ['examBases'] as const,
}

export function useExamBaseQueries(input?: { examBoardId?: string }) {
  return useQuery({
    queryKey: examBaseKeys.examBases,
    queryFn: () => examBaseService.list(input),
    enabled: input?.examBoardId != null && input.examBoardId !== '',
  })
}

