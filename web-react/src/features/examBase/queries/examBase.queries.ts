import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { examBaseService } from '../services/examBase.service'

export const examBaseKeys = {
  examBases: ['examBases'] as const,
  list: (examBoardId?: string) => ['examBases', examBoardId ?? 'all'] as const,
  one: (id: string) => ['examBase', id] as const,
  concurso: (id: string) => ['examBase', id, 'concurso'] as const,
  extractEdital: (url: string) => ['examBase', 'extract-edital', url] as const,
}

/**
 * Extração de edital COMPLETO (concurso + todos os cargos) como QUERY (não
 * mutation): dispara declarativamente quando `url` existe — imune ao
 * double-effect do StrictMode (mutate() em useEffect perde a atualização e o
 * pending nunca resolve) — e cacheada por URL (repetir a mesma extração não
 * paga OpenAI de novo).
 */
export function useExtractEditalQuery(url: string | null) {
  return useQuery({
    queryKey: examBaseKeys.extractEdital(url ?? ''),
    queryFn: () => examBaseService.extractEdital(url!),
    enabled: Boolean(url),
    staleTime: Infinity,
    retry: false,
  })
}

export function useExamConcursoProvasQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseKeys.concurso(examBaseId ?? ''),
    queryFn: () => examBaseService.getConcursoProvas(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useExamBaseQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseKeys.one(examBaseId ?? ''),
    queryFn: () => examBaseService.getOne(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useExamBaseQueries(input?: { examBoardId?: string }) {
  return useQuery({
    queryKey: examBaseKeys.list(input?.examBoardId),
    queryFn: () => examBaseService.list(input),
    enabled: true,
  })
}

export function useSetPublishedMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (published: boolean) =>
      examBaseService.setPublished(examBaseId, published),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.examBases })
    },
  })
}

export function useCreateDraftExamBaseMutation() {
  return useMutation({
    mutationFn: () => examBaseService.createDraft(),
  })
}

export function useExtractExamMetadataMutation() {
  return useMutation({
    mutationFn: (input: { url?: string; role?: string; pdfFile?: File }) =>
      examBaseService.extractMetadata(input),
  })
}

export function useDeleteExamBaseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examBaseId: string) => examBaseService.remove(examBaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.examBases })
    },
  })
}

export function useUpdateExamBaseMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof examBaseService.update>[1]) =>
      examBaseService.update(examBaseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.one(examBaseId) })
      // Salvar a prova pode criar Concurso + Cargo default e espelha a ficha
      // nos cargos onde ela é oficial (R4.3) — a seção de vínculos acompanha.
      queryClient.invalidateQueries({ queryKey: ['cargo'] })
    },
  })
}

// ── Conteúdo programático (syllabus groups) ──────────────────────────────────

export function useCreateSyllabusGroupMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; topics: string; order?: number }) =>
      examBaseService.createSyllabusGroup(examBaseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.one(examBaseId) })
    },
  })
}

export function useUpdateSyllabusGroupMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      groupId: string
      name?: string
      topics?: string
      order?: number
    }) => {
      const { groupId, ...rest } = input
      return examBaseService.updateSyllabusGroup(examBaseId, groupId, rest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.one(examBaseId) })
    },
  })
}

export function useReorderSyllabusGroupsMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: Array<string>) =>
      examBaseService.reorderSyllabusGroups(examBaseId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.one(examBaseId) })
    },
  })
}

export function useDeleteSyllabusGroupMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) =>
      examBaseService.deleteSyllabusGroup(examBaseId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseKeys.one(examBaseId) })
    },
  })
}

