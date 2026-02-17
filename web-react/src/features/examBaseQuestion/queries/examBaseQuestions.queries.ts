import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  examBaseQuestionsService,
  getApiMessage,
  isConflictError,
} from '../services/examBaseQuestions.service'
import type {
  ParsedQuestionItem,
  GenerateExplanationsResponse,
} from '../services/examBaseQuestions.service'
import type {
  CreateAlternativeInput,
  CreateExamBaseQuestionInput,
  UpdateAlternativeInput,
  UpdateExamBaseQuestionInput,
} from '../domain/examBaseQuestion.types'

export const examBaseQuestionsKeys = {
  list: (examBaseId: string) =>
    ['examBaseQuestions', examBaseId] as const,
  statsBySubject: (examBaseId: string) =>
    ['examBaseQuestions', 'statsBySubject', examBaseId] as const,
  availableToAdd: (examBaseId: string, subject?: string) =>
    ['examBaseQuestions', 'availableToAdd', examBaseId, subject ?? 'all'] as const,
  availableSubjects: (examBaseId: string) =>
    ['examBaseQuestions', 'availableSubjects', examBaseId] as const,
}

export function useExamBaseQuestionsQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseQuestionsKeys.list(examBaseId ?? ''),
    queryFn: () => examBaseQuestionsService.list(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useQuestionsCountBySubjectQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseQuestionsKeys.statsBySubject(examBaseId ?? ''),
    queryFn: () => examBaseQuestionsService.getQuestionsCountBySubject(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useAvailableToAddQuestionsQuery(
  examBaseId: string | undefined,
  subject?: string,
) {
  return useQuery({
    queryKey: examBaseQuestionsKeys.availableToAdd(examBaseId ?? '', subject),
    queryFn: () => examBaseQuestionsService.listAvailableToAdd(examBaseId!, subject),
    enabled: Boolean(examBaseId),
  })
}

export function useAvailableSubjectsQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseQuestionsKeys.availableSubjects(examBaseId ?? ''),
    queryFn: () => examBaseQuestionsService.listAvailableSubjects(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useCopyQuestionMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sourceExamBaseId,
      sourceQuestionId,
    }: {
      sourceExamBaseId: string
      sourceQuestionId: string
    }) =>
      examBaseQuestionsService.copyQuestion(
        examBaseId,
        sourceExamBaseId,
        sourceQuestionId,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useCreateExamBaseQuestionMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExamBaseQuestionInput) =>
      examBaseQuestionsService.create(examBaseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useParseQuestionsFromMarkdownMutation(examBaseId: string) {
  return useMutation({
    mutationFn: ({
      markdown,
      provider,
    }: {
      markdown: string
      provider: 'grok' | 'chatgpt'
    }) =>
      examBaseQuestionsService.parseFromMarkdown(examBaseId, markdown, provider),
  })
}

export function useExtractFromPdfMutation(examBaseId: string) {
  return useMutation({
    mutationFn: (file: File) =>
      examBaseQuestionsService.extractFromPdf(examBaseId, file),
  })
}

export function useGenerateExplanationsMutation(
  examBaseId: string,
  questionId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      examBaseQuestionsService.generateExplanations(examBaseId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export type { ParsedQuestionItem, GenerateExplanationsResponse }

export function useUpdateExamBaseQuestionMutation(
  examBaseId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      questionId,
      input,
    }: {
      questionId: string
      input: UpdateExamBaseQuestionInput
    }) =>
      examBaseQuestionsService.update(examBaseId, questionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useDeleteExamBaseQuestionMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) =>
      examBaseQuestionsService.delete(examBaseId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useCreateAlternativeMutation(
  examBaseId: string,
  questionId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAlternativeInput) =>
      examBaseQuestionsService.createAlternative(
        examBaseId,
        questionId,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useUpdateAlternativeMutation(
  examBaseId: string,
  questionId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      alternativeId,
      input,
    }: {
      alternativeId: string
      input: UpdateAlternativeInput
    }) =>
      examBaseQuestionsService.updateAlternative(
        examBaseId,
        questionId,
        alternativeId,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export function useDeleteAlternativeMutation(
  examBaseId: string,
  questionId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (alternativeId: string) =>
      examBaseQuestionsService.deleteAlternative(
        examBaseId,
        questionId,
        alternativeId,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examBaseQuestionsKeys.list(examBaseId) })
    },
  })
}

export { getApiMessage, isConflictError }
