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
  cargoSlugs: Array<string>
  totalPages: number
  totalEntries: number
  newEntries: number
  lastCargoSlug: string | null
  lastPage: number | null
  status: string
  errorLog: string | null
}

export type PciEntryStatus = PciExamEntry['status']

export type ScrapedDocumentKind =
  | 'EDITAL_ABERTURA'
  | 'RETIFICACAO'
  | 'GABARITO'
  | 'RESULTADO'
  | 'CONVOCACAO'
  | 'COMUNICADO'
  | 'OUTRO'

export interface ScrapedDocument {
  name: string
  summary: string | null
  url: string | null
  publishedAt: string | null
  kind: ScrapedDocumentKind
}

export interface DocumentScrapeResult {
  sourceUrl: string
  fetchedAt: string
  documents: Array<ScrapedDocument>
}

/** Documento raspado + se já existe na timeline do concurso (por URL). */
export type CheckedDocument = ScrapedDocument & { isNew: boolean }

export interface CheckConcursoDocumentsResult {
  sourceUrl: string
  /** ISO da verificação recém-feita. */
  checkedAt: string
  documents: Array<CheckedDocument>
}

/** Documento escolhido para adicionar à timeline (espelha NewDocumentDto). */
export interface NewConcursoDocument {
  title: string
  summary?: string | null
  url: string
  kind?: string | null
  publishedAt?: string | null
}

/** Mudança proposta pela análise de um documento (Fase 2). */
export interface ProposedChange {
  id: string
  target: 'concurso' | 'cargo'
  cargoId: string | null
  cargoRole: string | null
  field: string
  label: string
  currentValue: string | null
  newValue: string | null
  evidence: string | null
}

/** Etapa do cronograma proposto pela análise do documento. */
export interface ProposedEtapa {
  name: string
  description: string | null
  date: string | null
}

/** Matéria do quadro de provas proposto pela análise do documento. */
export interface ProposedSyllabusGroup {
  name: string
  topics: string | null
  questionCount: number | null
  weight: string | null
  maxScore: string | null
}

/** Quadro de matérias proposto para um cargo (substitui o quadro atual dele). */
export interface ProposedCargoSyllabus {
  cargoId: string
  cargoRole: string
  groups: Array<ProposedSyllabusGroup>
}

export interface AnalyzeDocumentResult {
  documentId: string
  analyzedAt: string
  changes: Array<ProposedChange>
  /** Cronograma proposto (etapas datadas do PDF); null se não há/idêntico. */
  cronograma: Array<ProposedEtapa> | null
  /** Quadros de matérias propostos por cargo; null se o documento não mexe. */
  syllabus: Array<ProposedCargoSyllabus> | null
}

// ---- Descoberta de concursos (/admin/gerenciar-concursos) ----

export type ConcursoStatus = 'open' | 'future' | 'past'

/** Concurso descoberto na busca do pciconcursos + situação na base. */
export interface DiscoveryCandidate {
  institution: string
  uf: string | null
  headline: string
  newsUrl: string
  status: 'new' | 'exists'
  matched: { id: string; slug: string | null } | null
}

export interface DiscoverySearchResult {
  cargoSlug: string
  fetchedAt: string
  candidates: Array<DiscoveryCandidate>
}

/** Payload para adicionar um concurso descoberto (espelha DiscoveryAddDto). */
export interface DiscoveryAddInput {
  institution: string
  uf: string | null
  headline: string
  newsUrl: string
}

export interface DiscoveryAddResult {
  concurso: { id: string; slug: string | null; institution: string }
  officialUrlFound: boolean
  created: boolean
}

/** Linha da listagem admin de concursos. */
export interface AdminConcursoRow {
  id: string
  slug: string | null
  institution: string
  state: string | null
  year: number
  status: ConcursoStatus
  provaCount: number
  needsSourceUrl: boolean
  registrationEnd: string | null
  createdAt: string
}

/** Resultado do "recorrigir links" em massa. */
export interface DiscoveryReextractResult {
  processed: number
  updated: number
  stillMissing: number
}
