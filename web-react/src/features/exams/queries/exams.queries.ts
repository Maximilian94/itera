import { useQuery } from '@tanstack/react-query'
import { examsService } from '../services/exams.service'

export const examsKeys = {
  exams: (input: { examBoardId?: string }) =>
    ['exams', input.examBoardId ?? null] as const,
}

export function useExamsQuery(input: { examBoardId?: string }) {
  return useQuery({
    queryKey: examsKeys.exams(input),
    queryFn: () => examsService.list(input),
    enabled: input.examBoardId != null && input.examBoardId !== '',
  })
}

