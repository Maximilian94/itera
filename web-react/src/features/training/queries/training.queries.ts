import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trainingService } from '../services/training.service'

function isUuid(value: string | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export const trainingKeys = {
  list: () => ['training', 'list'] as const,
  one: (trainingId: string) => ['training', trainingId] as const,
  studyItems: (trainingId: string) =>
    ['training', trainingId, 'studyItems'] as const,
  retryQuestions: (trainingId: string) =>
    ['training', trainingId, 'retryQuestions'] as const,
  retryQuestionsWithFeedback: (trainingId: string) =>
    ['training', trainingId, 'retryQuestionsWithFeedback'] as const,
  retryQuestionsWithFeedbackForStudy: (trainingId: string) =>
    ['training', trainingId, 'retryQuestionsWithFeedbackForStudy'] as const,
  retryAnswers: (trainingId: string) =>
    ['training', trainingId, 'retryAnswers'] as const,
  final: (trainingId: string) => ['training', trainingId, 'final'] as const,
}

export function useTrainingsQuery() {
  return useQuery({
    queryKey: trainingKeys.list(),
    queryFn: () => trainingService.list(),
  })
}

export function useTrainingQuery(trainingId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.one(trainingId ?? ''),
    queryFn: () => trainingService.getOne(trainingId!),
    enabled: isUuid(trainingId),
  })
}

export function useCreateTrainingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      examBaseId,
      subjectFilter,
    }: {
      examBaseId: string
      subjectFilter?: string[]
    }) => trainingService.create(examBaseId, subjectFilter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.list() })
      queryClient.invalidateQueries({ queryKey: ['training'] })
    },
  })
}

export function useTrainingStudyItemsQuery(trainingId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.studyItems(trainingId ?? ''),
    queryFn: () => trainingService.listStudyItems(trainingId!),
    enabled: Boolean(trainingId),
  })
}

export function useCompleteStudyItemMutation(
  trainingId: string,
  studyItemId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (completed: boolean) =>
      trainingService.completeStudyItem(trainingId, studyItemId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
      queryClient.invalidateQueries({
        queryKey: trainingKeys.studyItems(trainingId),
      })
    },
  })
}

export function useGenerateStudyItemContentMutation(
  trainingId: string,
  studyItemId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      trainingService.generateStudyItemContent(trainingId, studyItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trainingKeys.studyItems(trainingId),
      })
    },
  })
}

export function useUpdateStudyMutation(trainingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      subject,
      completed,
    }: {
      subject: string
      completed: boolean
    }) => trainingService.updateStudy(trainingId, subject, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    },
  })
}

export function useUpdateTrainingStageMutation(trainingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stage: string) =>
      trainingService.updateStage(trainingId, stage),
    onSuccess: (data) => {
      queryClient.setQueryData(trainingKeys.one(trainingId), data)
    },
  })
}

export function useRetryQuestionsQuery(trainingId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.retryQuestions(trainingId ?? ''),
    queryFn: () => trainingService.listRetryQuestions(trainingId!),
    enabled: Boolean(trainingId),
  })
}

export function useRetryQuestionsWithFeedbackQuery(
  trainingId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: trainingKeys.retryQuestionsWithFeedback(trainingId ?? ''),
    queryFn: () => trainingService.listRetryQuestionsWithFeedback(trainingId!),
    enabled: Boolean(trainingId) && enabled,
  })
}

export function useRetryQuestionsWithFeedbackForStudyQuery(
  trainingId: string | undefined,
) {
  return useQuery({
    queryKey: trainingKeys.retryQuestionsWithFeedbackForStudy(trainingId ?? ''),
    queryFn: () =>
      trainingService.listRetryQuestionsWithFeedbackForStudy(trainingId!),
    enabled: Boolean(trainingId),
  })
}

export function useRetryAnswersQuery(trainingId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.retryAnswers(trainingId ?? ''),
    queryFn: () => trainingService.getRetryAnswers(trainingId!),
    enabled: Boolean(trainingId),
  })
}

export function useUpsertRetryAnswerMutation(trainingId: string) {
  const queryClient = useQueryClient()
  const queryKey = trainingKeys.retryAnswers(trainingId)
  return useMutation({
    mutationFn: ({
      questionId,
      selectedAlternativeId,
    }: {
      questionId: string
      selectedAlternativeId: string
    }) =>
      trainingService.upsertRetryAnswer(
        trainingId,
        questionId,
        selectedAlternativeId,
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Record<string, string | null>>(
        queryKey,
      )
      queryClient.setQueryData(queryKey, (old: Record<string, string | null> | undefined) => ({
        ...(old ?? {}),
        [input.questionId]: input.selectedAlternativeId,
      }))
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
