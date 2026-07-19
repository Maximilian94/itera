import type {
  AdminConcursoRow,
  AnalyzeDocumentResult,
  CheckConcursoDocumentsResult,
  DiscoveryAddInput,
  DiscoveryAddResult,
  DiscoveryReextractResult,
  DiscoverySearchResult,
  DocumentScrapeResult,
  NewConcursoDocument,
  PciEntryStatus,
  PciExamEntry,
  ProposedCargoSyllabus,
  ProposedChange,
  ProposedEtapa,
  ScraperRun,
} from './scraper.types'
import { apiFetch } from '@/lib/api'

const BASE = '/admin/scraper'

export const scraperService = {
  triggerRun(cargoSlugs?: Array<string>): Promise<ScraperRun> {
    return apiFetch<ScraperRun>(`${BASE}/run`, {
      method: 'POST',
      body: JSON.stringify(cargoSlugs?.length ? { cargoSlugs } : {}),
    })
  },

  listRuns(): Promise<Array<ScraperRun>> {
    return apiFetch<Array<ScraperRun>>(`${BASE}/runs`, { method: 'GET' })
  },

  getRunStatus(id: string): Promise<ScraperRun> {
    return apiFetch<ScraperRun>(`${BASE}/runs/${id}`, { method: 'GET' })
  },

  listEntries(): Promise<Array<PciExamEntry>> {
    return apiFetch<Array<PciExamEntry>>(`${BASE}/entries`, { method: 'GET' })
  },

  getRunDiff(runId: string): Promise<Array<PciExamEntry>> {
    return apiFetch<Array<PciExamEntry>>(`${BASE}/entries/diff/${runId}`, {
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

  scrapeDocuments(url: string): Promise<DocumentScrapeResult> {
    return apiFetch<DocumentScrapeResult>(`${BASE}/documents`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    })
  },

  scrapeDocumentsFromHtml(
    html: string,
    sourceUrl: string,
  ): Promise<DocumentScrapeResult> {
    return apiFetch<DocumentScrapeResult>(`${BASE}/documents/from-html`, {
      method: 'POST',
      body: JSON.stringify({ html, sourceUrl }),
    })
  },

  /** Aba Notícias: verifica novas publicações do concurso (re-raspa a origem). */
  checkConcursoDocuments(
    concursoId: string,
    body: { sourceUrl?: string; html?: string } = {},
  ): Promise<CheckConcursoDocumentsResult> {
    return apiFetch<CheckConcursoDocumentsResult>(
      `${BASE}/concursos/${concursoId}/documents/check`,
      { method: 'POST', body: JSON.stringify(body) },
    )
  },

  /** Aba Notícias: adiciona os documentos escolhidos à timeline (upsert). */
  addConcursoDocuments(
    concursoId: string,
    documents: Array<NewConcursoDocument>,
  ): Promise<{ addedCount: number }> {
    return apiFetch<{ addedCount: number }>(
      `${BASE}/concursos/${concursoId}/documents`,
      { method: 'POST', body: JSON.stringify({ documents }) },
    )
  },

  /** Fase 2: lê o PDF do documento e propõe mudanças (sem aplicar). */
  analyzeDocument(
    concursoId: string,
    documentId: string,
  ): Promise<AnalyzeDocumentResult> {
    return apiFetch<AnalyzeDocumentResult>(
      `${BASE}/concursos/${concursoId}/documents/${documentId}/analyze`,
      { method: 'POST', body: JSON.stringify({}) },
    )
  },

  /** Fase 2: aplica as mudanças aprovadas ao concurso/cargos (+ cronograma + quadro). */
  applyDocumentChanges(
    concursoId: string,
    documentId: string,
    changes: Array<ProposedChange>,
    cronograma?: Array<ProposedEtapa> | null,
    syllabus?: Array<ProposedCargoSyllabus> | null,
  ): Promise<{ appliedCount: number }> {
    return apiFetch<{ appliedCount: number }>(
      `${BASE}/concursos/${concursoId}/documents/${documentId}/apply`,
      { method: 'POST', body: JSON.stringify({ changes, cronograma, syllabus }) },
    )
  },

  promoteEntry(
    id: string,
  ): Promise<{ examBase: { id: string }; pciEntry: { id: string; status: string } }> {
    return apiFetch(`${BASE}/entries/${id}/promote`, { method: 'POST' })
  },

  // ---- Descoberta de concursos (/admin/gerenciar-concursos) ----

  /** Listagem admin de todos os concursos (com status + alerta de link). */
  listAdminConcursos(): Promise<Array<AdminConcursoRow>> {
    return apiFetch<Array<AdminConcursoRow>>(`${BASE}/concursos`, {
      method: 'GET',
    })
  },

  /** "Procurar novos concursos": raspa o pciconcursos e cruza com a base. */
  discoverySearch(cargoSlug?: string): Promise<DiscoverySearchResult> {
    return apiFetch<DiscoverySearchResult>(`${BASE}/discovery/search`, {
      method: 'POST',
      body: JSON.stringify(cargoSlug ? { cargoSlug } : {}),
    })
  },

  /** Adiciona um concurso descoberto (stub + link oficial extraído da notícia). */
  discoveryAdd(candidate: DiscoveryAddInput): Promise<DiscoveryAddResult> {
    return apiFetch<DiscoveryAddResult>(`${BASE}/discovery/add`, {
      method: 'POST',
      body: JSON.stringify(candidate),
    })
  },

  /** Recorrige em massa o link do concurso de todos os concursos vindos do pci. */
  discoveryReextract(): Promise<DiscoveryReextractResult> {
    return apiFetch<DiscoveryReextractResult>(`${BASE}/discovery/reextract`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },
}
