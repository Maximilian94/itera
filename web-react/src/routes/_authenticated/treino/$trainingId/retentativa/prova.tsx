/**
 * Prova da re-tentativa: usa o mesmo ExamAttemptPlayer da prova normal em modo retry (trainingId).
 * Assim o aluno vê as mesmas abas (Questão, Explicação, Estatísticas, Comentários, etc.) e a mesma UI.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import { getStagePath } from '../../-stages.config'
import { useQueryClient } from '@tanstack/react-query'
import { trainingKeys } from '@/features/training/queries/training.queries'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/retentativa/prova',
)({
  component: RetentativaProvaPage,
})

function RetentativaProvaPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <ExamAttemptPlayer
      trainingId={trainingId}
      onBack={() => navigate({ to: getStagePath('retentativa', trainingId) })}
      onFinished={() => {
        queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
        navigate({ to: getStagePath('final', trainingId) })
      }}
      onNavigateToFinal={() => navigate({ to: getStagePath('final', trainingId) })}
    />
  )
}
