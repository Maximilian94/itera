import type { DocumentScrapeResult } from './scraper.types'

/**
 * Ponte entre o scraper de documentos e a página criar-concurso: a lista de
 * documentos raspados é grande demais para query params, então fica um passo
 * em sessionStorage. Só sobrevive à navegação imediata — é lida uma vez e
 * limpa após criar o concurso (ou ignorada se o admin chegou por outro caminho).
 */
const KEY = 'criar-concurso:scrape'

export type ScrapeStash = Pick<DocumentScrapeResult, 'sourceUrl' | 'documents'>

export function stashScrape(result: ScrapeStash): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ sourceUrl: result.sourceUrl, documents: result.documents }),
    )
  } catch {
    // sessionStorage indisponível (modo privado saturado) — segue sem stash.
  }
}

export function readScrape(): ScrapeStash | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScrapeStash | null
    if (!parsed || !Array.isArray(parsed.documents)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearScrape(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
