import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getStagePath } from '../../stages.config'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import { useQueryClient } from '@tanstack/react-query'
import { trainingKeys } from '@/features/training/queries/training.queries'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/retentativa/',
)({
  component: RetentativaIndexPage,
})

function RetentativaIndexPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <>
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ExamAttemptPlayer
          trainingId={trainingId}
          onBack={() => navigate({ to: getStagePath('estudo', trainingId) })}
          onFinished={() => {
            queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
            navigate({ to: getStagePath('final', trainingId) })
          }}
          onNavigateToFinal={() => navigate({ to: getStagePath('final', trainingId) })}
        />
      </div>

      <div className="flex flex-wrap gap-3 justify-between mt-4">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('estudo', trainingId) })}
        >
          Voltar: Estudo
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('final', trainingId) })}
        >
          Próxima: Final
        </Button>
      </div>
    </>
  )
}
