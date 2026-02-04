import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { examBaseAttemptService } from '../services/examBaseAttempt.service'
import type { UpsertAnswerInput } from '../domain/examBaseAttempt.types'

export const examBaseAttemptKeys = {
  list: (examBaseId: string) => ['examBaseAttempts', examBaseId] as const,
  one: (examBaseId: string, attemptId: string) =>
    ['examBaseAttempt', examBaseId, attemptId] as const,
  feedback: (examBaseId: string, attemptId: string) =>
    ['examBaseAttemptFeedback', examBaseId, attemptId] as const,
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
    mutationFn: () => examBaseAttemptService.create(examBaseId),
    onSuccess: (_, __, ___) => {
      if (examBaseId) {
        queryClient.invalidateQueries({
          queryKey: examBaseAttemptKeys.list(examBaseId),
        })
      }
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
  return useMutation({
    mutationFn: (input: UpsertAnswerInput) =>
      examBaseAttemptService.upsertAnswer(examBaseId, attemptId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: examBaseAttemptKeys.one(examBaseId, attemptId),
      })
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
    },
  })
}

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
