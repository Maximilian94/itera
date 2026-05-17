export interface PciExamEntry {
  id: string
  downloadUrl: string
  examName: string
  year: number
  institution: string
  examBoardRaw: string
  cargoSlug: string
  cargoRaw: string | null
  governmentScope: 'FEDERAL' | 'STATE' | 'MUNICIPAL' | null
  state: string | null
  city: string | null
  priorityScore: number
  status: 'PENDING' | 'PROMOTED' | 'SKIPPED' | 'UNAVAILABLE'
  promotedToId: string | null
  scraperRunId: string | null
  scrapedAt: string
  pageUrl: string
}

export interface ScraperRun {
  id: string
  startedAt: string
  finishedAt: string | null
  cargoSlugs: string[]
  totalPages: number
  totalEntries: number
  newEntries: number
  lastCargoSlug: string | null
  lastPage: number | null
  status: string
  errorLog: string | null
}

export type PciEntryStatus = PciExamEntry['status']
