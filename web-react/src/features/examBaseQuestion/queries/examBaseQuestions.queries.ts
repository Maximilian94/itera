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
import type { ParsedQuestionItem } from '../services/examBaseQuestions.service'
import type {
  CreateAlternativeInput,
  CreateExamBaseQuestionInput,
  UpdateAlternativeInput,
  UpdateExamBaseQuestionInput,
} from '../domain/examBaseQuestion.types'

export const examBaseQuestionsKeys = {
  list: (examBaseId: string) =>
    ['examBaseQuestions', examBaseId] as const,
}

export function useExamBaseQuestionsQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseQuestionsKeys.list(examBaseId ?? ''),
    queryFn: () => examBaseQuestionsService.list(examBaseId!),
    enabled: Boolean(examBaseId),
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
    mutationFn: (markdown: string) =>
      examBaseQuestionsService.parseFromMarkdown(examBaseId, markdown),
  })
}

export type { ParsedQuestionItem }

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
