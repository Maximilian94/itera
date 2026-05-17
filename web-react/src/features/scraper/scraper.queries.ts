import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scraperService } from './scraper.service'

export const scraperKeys = {
  entries: () => ['scraper', 'entries'] as const,
  runs: () => ['scraper', 'runs'] as const,
  run: (id: string) => ['scraper', 'run', id] as const,
  diff: (runId: string) => ['scraper', 'diff', runId] as const,
}

export function useScraperEntriesQuery() {
  return useQuery({
    queryKey: scraperKeys.entries(),
    queryFn: () => scraperService.listEntries(),
  })
}

export function useScraperRunsQuery() {
  return useQuery({
    queryKey: scraperKeys.runs(),
    queryFn: () => scraperService.listRuns(),
  })
}

export function useScraperRunStatusQuery(
  runId: string | null,
  isRunning: boolean,
) {
  return useQuery({
    queryKey: scraperKeys.run(runId ?? ''),
    queryFn: () => scraperService.getRunStatus(runId!),
    enabled: !!runId,
    refetchInterval: isRunning ? 3000 : false,
  })
}

export function useTriggerRunMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cargoSlugs?: string[]) =>
      scraperService.triggerRun(cargoSlugs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.runs() })
    },
  })
}

export function useUpdateEntryStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: 'PENDING' | 'PROMOTED' | 'SKIPPED' | 'UNAVAILABLE'
    }) => scraperService.updateEntryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.entries() })
    },
  })
}

export function usePromoteEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scraperService.promoteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.entries() })
    },
  })
}
