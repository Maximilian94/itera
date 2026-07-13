import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trainingService } from '../services/training.service'
import { concursoKeys } from '@/features/concurso/queries/concurso.queries'

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
      immediateFeedback,
    }: {
      examBaseId: string
      subjectFilter?: Array<string>
      immediateFeedback?: boolean
    }) => trainingService.create(examBaseId, subjectFilter, immediateFeedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.list() })
      queryClient.invalidateQueries({ queryKey: ['training'] })
      // Começar um treino muda o payload do cargo (attemptCount/plano); o
      // detalhe tem staleTime de 5 min — sem invalidar, a prontidão fica
      // stale (paridade com useStartSimuladoMutation, T2.3).
      queryClient.invalidateQueries({ queryKey: concursoKeys.all })
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
      // A lista (GET /training) alimenta o stepper embutido na página do cargo;
      // sem invalidar, o estágio atual fica defasado após avançar de fase.
      queryClient.invalidateQueries({ queryKey: trainingKeys.list() })
      // Avançar para STUDY cria os itens de estudo no backend; no fluxo
      // embutido o TrainingFlow não remonta — sem invalidar, a fase Estudo
      // mostraria "Nenhuma recomendação ainda" com a lista já criada (T2.2).
      queryClient.invalidateQueries({
        queryKey: trainingKeys.studyItems(trainingId),
      })
      // GoalCard/TrainingHeader/ReadinessBar leem o detalhe do cargo
      // (staleTime 5 min): avanço de fase muda plano/prontidão (T2.3).
      queryClient.invalidateQueries({ queryKey: concursoKeys.all })
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
