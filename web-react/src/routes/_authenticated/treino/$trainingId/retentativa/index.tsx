import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, ChartBarIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { getStagePath } from '../../-stages.config'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import { useQueryClient } from '@tanstack/react-query'
import { trainingKeys } from '@/features/training/queries/training.queries'
import { useCallback, useState } from 'react'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/retentativa/',
)({
  component: RetentativaIndexPage,
})

function RetentativaIndexPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [retentativaState, setRetentativaState] = useState<{
    isFinished: boolean
    isFinishPending: boolean
    finish: () => void
    hasUnansweredQuestions: boolean
    firstUnansweredIndex: number
    goToQuestion: (index: number) => void
  } | null>(null)
  const [unansweredModalOpen, setUnansweredModalOpen] = useState(false)

  const handleFinished = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    navigate({ to: getStagePath('final', trainingId) })
  }, [queryClient, trainingId, navigate])

  const triggerFinish = useCallback(() => {
    retentativaState?.finish()
  }, [retentativaState])

  return (
    <>
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <ExamAttemptPlayer
          trainingId={trainingId}
          trainingProvaMode
          onBack={() => navigate({ to: getStagePath('estudo', trainingId) })}
          onFinished={handleFinished}
          onNavigateToFinal={() => navigate({ to: getStagePath('final', trainingId) })}
          onTrainingProvaStateChange={setRetentativaState}
        />
      </div>

      <div className="flex flex-wrap gap-3 justify-between mt-4 shrink-0">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('estudo', trainingId) })}
        >
          Voltar: Estudo
        </Button>
        <div className="flex flex-wrap gap-3">
          {retentativaState && !retentativaState.isFinished && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (retentativaState.hasUnansweredQuestions) {
                  setUnansweredModalOpen(true)
                } else {
                  triggerFinish()
                }
              }}
              disabled={retentativaState.isFinishPending}
              startIcon={
                retentativaState.isFinishPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              {retentativaState.isFinishPending
                ? 'Concluindo…'
                : 'Concluir re-tentativa'}
            </Button>
          )}
          <Button
            variant={retentativaState?.isFinished ? 'contained' : 'outlined'}
            color="primary"
            endIcon={<ChartBarIcon className="w-5 h-5" />}
            onClick={() => navigate({ to: getStagePath('final', trainingId) })}
          >
            Ir para fase final
          </Button>
        </div>
      </div>

      <Dialog
        open={unansweredModalOpen}
        onClose={() => setUnansweredModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Questões não respondidas</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Existem questões que ainda não foram respondidas. Deseja ir para uma
            delas ou prefere concluir a re-tentativa mesmo assim?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              if (retentativaState) {
                retentativaState.goToQuestion(retentativaState.firstUnansweredIndex)
                setUnansweredModalOpen(false)
              }
            }}
            variant="contained"
            color="primary"
            startIcon={<PencilSquareIcon className="w-5 h-5" />}
          >
            Ir para questão {retentativaState ? retentativaState.firstUnansweredIndex + 1 : ''}
          </Button>
          <Button
            onClick={() => {
              setUnansweredModalOpen(false)
              triggerFinish()
            }}
            color="inherit"
          >
            Concluir mesmo assim
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
