import { apiFetch } from '@/lib/api'
import type { PciExamEntry, PciEntryStatus, ScraperRun } from './scraper.types'

const BASE = '/admin/scraper'

export const scraperService = {
  triggerRun(cargoSlugs?: string[]): Promise<ScraperRun> {
    return apiFetch<ScraperRun>(`${BASE}/run`, {
      method: 'POST',
      body: JSON.stringify(cargoSlugs?.length ? { cargoSlugs } : {}),
    })
  },

  listRuns(): Promise<ScraperRun[]> {
    return apiFetch<ScraperRun[]>(`${BASE}/runs`, { method: 'GET' })
  },

  getRunStatus(id: string): Promise<ScraperRun> {
    return apiFetch<ScraperRun>(`${BASE}/runs/${id}`, { method: 'GET' })
  },

  listEntries(): Promise<PciExamEntry[]> {
    return apiFetch<PciExamEntry[]>(`${BASE}/entries`, { method: 'GET' })
  },

  getRunDiff(runId: string): Promise<PciExamEntry[]> {
    return apiFetch<PciExamEntry[]>(`${BASE}/entries/diff/${runId}`, {
      method: 'GET',
    })
  },

  updateEntryStatus(
    id: string,
    status: PciEntryStatus,
  ): Promise<PciExamEntry> {
    return apiFetch<PciExamEntry>(`${BASE}/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  promoteEntry(
    id: string,
  ): Promise<{ examBase: { id: string }; pciEntry: { id: string; status: string } }> {
    return apiFetch(`${BASE}/entries/${id}/promote`, { method: 'POST' })
  },
}
