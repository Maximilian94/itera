import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scraperService } from './scraper.service'
import type {
  DiscoveryAddInput,
  NewConcursoDocument,
  ProposedCargoSyllabus,
  ProposedChange,
  ProposedEtapa,
  ProposedNewCargo,
} from './scraper.types'

export const scraperKeys = {
  entries: () => ['scraper', 'entries'] as const,
  runs: () => ['scraper', 'runs'] as const,
  run: (id: string) => ['scraper', 'run', id] as const,
  diff: (runId: string) => ['scraper', 'diff', runId] as const,
  adminConcursos: () => ['scraper', 'admin-concursos'] as const,
  concursoCosts: (id: string) => ['scraper', 'concurso-costs', id] as const,
}

export function useAdminConcursosQuery() {
  return useQuery({
    queryKey: scraperKeys.adminConcursos(),
    queryFn: () => scraperService.listAdminConcursos(),
  })
}

export function useDiscoverySearchMutation() {
  return useMutation({
    mutationFn: (cargoSlug?: string) =>
      scraperService.discoverySearch(cargoSlug),
  })
}

export function useDiscoveryAddMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (candidate: DiscoveryAddInput) =>
      scraperService.discoveryAdd(candidate),
    onSuccess: () => {
      // O concurso novo entra na listagem admin e na descoberta pública.
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
    },
  })
}

export function useDiscoveryReextractMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => scraperService.discoveryReextract(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
    },
  })
}

/** Aba Admin: grava/limpa o link de documentos digitado pelo admin. */
export function useSetConcursoSourceUrlMutation(concursoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string | null) =>
      scraperService.setConcursoSourceUrl(concursoId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
    },
  })
}

/** Aba Admin do concurso: procura o link oficial e regrava no concurso. */
export function useFindConcursoLinkMutation(concursoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => scraperService.findConcursoLink(concursoId),
    onSuccess: () => {
      // documentsSourceUrl mudou → a ficha e a barra de Notícias reagem.
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
    },
  })
}

export function useSetConcursoClosedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, closed }: { id: string; closed: boolean }) =>
      scraperService.setConcursoClosed(id, closed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
    },
  })
}

/** Fase 2: lê a notícia de origem e preenche a ficha do concurso. */
export function useExtractNewsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (concursoId: string) => scraperService.extractNews(concursoId),
    onSuccess: (_res, concursoId) => {
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
      queryClient.invalidateQueries({
        queryKey: scraperKeys.concursoCosts(concursoId),
      })
    },
  })
}

/** Fase 6: publica/despublica o concurso. */
export function useSetConcursoPublishedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      scraperService.setConcursoPublished(id, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scraperKeys.adminConcursos() })
      // A visibilidade mudou: a listagem pública e o nível 1 reagem.
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
      queryClient.invalidateQueries({ queryKey: ['concursos'] })
    },
  })
}

/** Histórico de custo de IA por fase (aba Admin do concurso). */
export function useConcursoCostsQuery(concursoId: string, enabled = true) {
  return useQuery({
    queryKey: scraperKeys.concursoCosts(concursoId),
    queryFn: () => scraperService.getConcursoCosts(concursoId),
    enabled: enabled && !!concursoId,
  })
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
    mutationFn: (cargoSlugs?: Array<string>) =>
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

export function useScrapeDocumentsMutation() {
  return useMutation({
    mutationFn: (url: string) => scraperService.scrapeDocuments(url),
  })
}

export function useScrapeDocumentsFromHtmlMutation() {
  return useMutation({
    mutationFn: ({ html, sourceUrl }: { html: string; sourceUrl: string }) =>
      scraperService.scrapeDocumentsFromHtml(html, sourceUrl),
  })
}

export function useCheckConcursoDocumentsMutation(concursoId: string) {
  return useMutation({
    mutationFn: (body: { sourceUrl?: string; html?: string } = {}) =>
      scraperService.checkConcursoDocuments(concursoId, body),
  })
}

export function useAddConcursoDocumentsMutation(concursoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documents: Array<NewConcursoDocument>) =>
      scraperService.addConcursoDocuments(concursoId, documents),
    onSuccess: () => {
      // A timeline vive no payload do concurso — revalida tudo relacionado.
      queryClient.invalidateQueries({ queryKey: ['concurso'] })
    },
  })
}

export function useAnalyzeDocumentMutation(concursoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file?: File }) =>
      scraperService.analyzeDocument(concursoId, documentId, file),
    // analyzedAt muda → refresca a timeline (selo "Lido").
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['concurso'] }),
  })
}

export function useApplyDocumentChangesMutation(concursoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      changes,
      cronograma,
      syllabus,
      newCargos,
    }: {
      documentId: string
      changes: Array<ProposedChange>
      cronograma?: Array<ProposedEtapa> | null
      syllabus?: Array<ProposedCargoSyllabus> | null
      newCargos?: Array<ProposedNewCargo> | null
    }) =>
      scraperService.applyDocumentChanges(
        concursoId,
        documentId,
        changes,
        cronograma,
        syllabus,
        newCargos,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['concurso'] }),
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
