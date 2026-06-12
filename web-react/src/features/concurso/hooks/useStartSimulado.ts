import { useMemo } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { concursoKeys } from '../queries/concurso.queries'
import type { SubjectDistribution } from '../domain/concurso.types'
import { examBaseAttemptKeys } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { examBaseAttemptService } from '@/features/examBaseAttempt/services/examBaseAttempt.service'
import { examBaseQuestionsKeys } from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'

/** Bucket de `subject` null no payload da distribuição — não filtrável. */
export const OUTROS_SUBJECT = 'Outros'

export type StartSimuladoInput = {
  examBoardId: string
  examBaseId: string
  /** Vazio/ausente = prova completa; senão treino filtrado por matéria. */
  subjectFilter?: Array<string>
}

/**
 * Cria um attempt (fluxo de simulado avulso, com filtro opcional de matéria)
 * e navega para a prova. O history fica com a página de origem (concurso/cargo)
 * logo atrás, então "voltar" do treino retorna para ela.
 *
 * Invalida as queries de concurso na criação: ao voltar, attemptCount,
 * plano de estudos e acurácias refletem o treino feito.
 */
export function useStartSimuladoMutation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ examBaseId, subjectFilter }: StartSimuladoInput) =>
      examBaseAttemptService.create(examBaseId, subjectFilter),
    onSuccess: async (attempt, { examBoardId, examBaseId }) => {
      queryClient.invalidateQueries({ queryKey: examBaseAttemptKeys.list(examBaseId) })
      queryClient.invalidateQueries({ queryKey: examBaseAttemptKeys.history() })
      queryClient.invalidateQueries({ queryKey: concursoKeys.all })
      await navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: { examBoard: examBoardId, examId: examBaseId, attemptId: attempt.id },
      })
    },
  })
}

/**
 * Resolve, por matéria da distribuição, em qual prova treinar:
 * - `actual`: as questões são da própria prova → todas as matérias treinam nela;
 * - `historical`: as matérias vêm da união das provas-fonte → cada matéria
 *   treina na edição mais recente que de fato tem questões dela.
 *
 * "Outros" (bucket de subject null) fica de fora: não há como filtrar por ele.
 * Matéria ausente do mapa = treino impossível → a linha não vira CTA.
 */
export function useSubjectTrainTargets(
  distribution: SubjectDistribution | undefined,
  ownExamBaseId: string,
): ReadonlyMap<string, string> {
  const isHistorical = distribution?.mode === 'historical'
  const sourceExams = useMemo(
    () =>
      distribution?.mode === 'historical'
        ? [...distribution.sourceExams].sort((a, b) => b.year - a.year)
        : [],
    [distribution],
  )

  const sourceSubjectQueries = useQueries({
    queries: sourceExams.map((exam) => ({
      queryKey: examBaseQuestionsKeys.statsBySubject(exam.examBaseId),
      queryFn: () => examBaseQuestionsService.getQuestionsCountBySubject(exam.examBaseId),
      staleTime: 5 * 60 * 1000,
    })),
  })

  // Barato (poucas matérias/provas) — recalcula a cada render, sem memo.
  const map = new Map<string, string>()
  if (distribution == null) return map
  if (!isHistorical) {
    for (const s of distribution.subjects) {
      if (s.subject !== OUTROS_SUBJECT && s.count > 0) {
        map.set(s.subject, ownExamBaseId)
      }
    }
    return map
  }
  // Mais recente primeiro: a primeira prova-fonte com a matéria vence.
  sourceExams.forEach((exam, i) => {
    const stats = sourceSubjectQueries[i]?.data ?? []
    for (const { subject, count } of stats) {
      if (subject !== OUTROS_SUBJECT && count > 0 && !map.has(subject)) {
        map.set(subject, exam.examBaseId)
      }
    }
  })
  return map
}
