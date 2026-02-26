import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { examBaseAttemptService } from '../services/examBaseAttempt.service'
import type { UpsertAnswerInput } from '../domain/examBaseAttempt.types'

export const examBaseAttemptKeys = {
  list: (examBaseId: string) => ['examBaseAttempts', examBaseId] as const,
  history: (examBaseId?: string) =>
    ['examBaseAttempts', 'history', examBaseId ?? 'all'] as const,
  one: (examBaseId: string, attemptId: string) =>
    ['examBaseAttempt', examBaseId, attemptId] as const,
  feedback: (examBaseId: string, attemptId: string) =>
    ['examBaseAttemptFeedback', examBaseId, attemptId] as const,
}

export function useExamBaseAttemptHistoryQuery(examBaseId?: string) {
  return useQuery({
    queryKey: examBaseAttemptKeys.history(examBaseId),
    queryFn: () => examBaseAttemptService.listHistory(examBaseId),
  })
}

export function useExamBaseAttemptsQuery(examBaseId: string | undefined) {
  return useQuery({
    queryKey: examBaseAttemptKeys.list(examBaseId ?? ''),
    queryFn: () => examBaseAttemptService.list(examBaseId!),
    enabled: Boolean(examBaseId),
  })
}

export function useCreateExamBaseAttemptMutation(examBaseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subjectFilter?: string[]) =>
      examBaseAttemptService.create(examBaseId, subjectFilter),
    onSuccess: () => {
      if (examBaseId) {
        queryClient.invalidateQueries({
          queryKey: examBaseAttemptKeys.list(examBaseId),
        })
        queryClient.invalidateQueries({
          queryKey: examBaseAttemptKeys.history(examBaseId),
        })
      }
      queryClient.invalidateQueries({ queryKey: examBaseAttemptKeys.history() })
    },
  })
}

export function useExamBaseAttemptQuery(
  examBaseId: string | undefined,
  attemptId: string | undefined,
) {
  return useQuery({
    queryKey: examBaseAttemptKeys.one(examBaseId ?? '', attemptId ?? ''),
    queryFn: () =>
      examBaseAttemptService.getOne(examBaseId!, attemptId!),
    enabled: Boolean(examBaseId && attemptId),
  })
}

export function useUpsertExamBaseAttemptAnswerMutation(
  examBaseId: string,
  attemptId: string,
) {
  const queryClient = useQueryClient()
  const queryKey = examBaseAttemptKeys.one(examBaseId, attemptId)
  return useMutation({
    mutationFn: (input: UpsertAnswerInput) =>
      examBaseAttemptService.upsertAnswer(examBaseId, attemptId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<{
        attempt: unknown
        questions: unknown[]
        answers: Record<string, string | null>
      }>(queryKey)
      queryClient.setQueryData(queryKey, (old: typeof previous) => {
        if (!old) return old
        return {
          ...old,
          answers: {
            ...old.answers,
            [input.questionId]: input.selectedAlternativeId,
          },
        }
      })
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

export function useFinishExamBaseAttemptMutation(
  examBaseId: string,
  attemptId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examBaseAttemptService.finish(examBaseId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: examBaseAttemptKeys.one(examBaseId, attemptId),
      })
      queryClient.invalidateQueries({ queryKey: examBaseAttemptKeys.history() })
    },
  })
}

/**
 * Fetches full feedback for a finished attempt (stats + AI subject feedback).
 */
export function useExamBaseAttemptFeedbackQuery(
  examBaseId: string | undefined,
  attemptId: string | undefined,
) {
  return useQuery({
    queryKey: examBaseAttemptKeys.feedback(examBaseId ?? '', attemptId ?? ''),
    queryFn: () =>
      examBaseAttemptService.getFeedback(examBaseId!, attemptId!),
    enabled: Boolean(examBaseId && attemptId),
  })
}

/**
 * Mutation to generate AI feedback per subject for a finished attempt.
 * Invalidates feedback query on success so the page refetches.
 */
export function useGenerateSubjectFeedbackMutation(
  examBaseId: string,
  attemptId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      examBaseAttemptService.generateSubjectFeedback(examBaseId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: examBaseAttemptKeys.feedback(examBaseId, attemptId),
      })
    },
  })
}
