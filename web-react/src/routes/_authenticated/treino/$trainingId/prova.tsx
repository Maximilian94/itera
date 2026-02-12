import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ClipboardDocumentListIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from '../stages.config'
import { getStagePath } from '../stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import { useQueryClient } from '@tanstack/react-query'
import { trainingKeys } from '@/features/training/queries/training.queries'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/prova')({
  component: ProvaPage,
})

function ProvaPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const stage = getStageById(1)!
  const { data: training, isLoading } = useTrainingQuery(trainingId)

  const canOpenExam = Boolean(training?.examBoardId && training?.examBaseId && training?.attemptId)

  const handleExamFinished = () => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <ClipboardDocumentListIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa 1 de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div> */}

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : !canOpenExam || !training ? (
        training && !training.examBoardId ? (
          <Card noElevation className="p-6">
            <p className="text-sm text-amber-700">
              Este simulado não está vinculado a uma banca. Não é possível abrir a prova por aqui.
            </p>
          </Card>
        ) : null
      ) : (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* {training.examTitle && (
            <p className="text-slate-700 font-medium text-sm">{training.examTitle}</p>
          )} */}
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            <ExamAttemptPlayer
              examBaseId={training.examBaseId}
              attemptId={training.attemptId}
              feedbackLink={{
                examBoard: training.examBoardId!,
                examId: training.examBaseId,
                attemptId: training.attemptId,
              }}
              onBack={() => navigate({ to: '/treino' })}
              onFinished={handleExamFinished}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-between mt-4 shrink-0">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          component={Link}
          to="/treino"
        >
          Voltar ao início
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('diagnostico', trainingId) })}
        >
          Próxima: Diagnóstico
        </Button>
      </div>
    </div>
  )
}
