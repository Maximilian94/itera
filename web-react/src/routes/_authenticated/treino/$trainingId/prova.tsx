import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ClipboardDocumentListIcon, ArrowLeftIcon, ArrowRightIcon, PlayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from '../stages.config'
import { getStagePath } from '../stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/prova')({
  component: ProvaPage,
})

function ProvaPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const stage = getStageById(1)!
  const { data: training, isLoading } = useTrainingQuery(trainingId)

  const canOpenExam = Boolean(training?.examBoardId && training?.examBaseId && training?.attemptId)
  const isAttemptFinished = Boolean(training?.attemptFinishedAt)
  const isExamInProgress = training?.currentStage === 'EXAM' && !isAttemptFinished

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
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
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <Card noElevation className="p-6">
          {training?.examTitle && (
            <p className="text-slate-700 font-medium mb-3">{training.examTitle}</p>
          )}
          <p className="text-slate-600 mb-4">
            {isAttemptFinished
              ? 'Você já concluiu esta prova. Veja o resultado abaixo e avance para o diagnóstico quando quiser.'
              : 'Responda às questões do simulado no mesmo formato que você já conhece. Ao terminar, finalize a prova e volte aqui para seguir para o diagnóstico.'}
          </p>
          {canOpenExam && training ? (
            <>
              {isAttemptFinished ? (
                <Link
                  to="/exams/$examBoard/$examId/$attemptId/feedback"
                  params={{
                    examBoard: training.examBoardId!,
                    examId: training.examBaseId,
                    attemptId: training.attemptId,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<DocumentTextIcon className="w-5 h-5" />}
                  >
                    Ver resultado da prova
                  </Button>
                </Link>
              ) : (
                <Link
                  to="/exams/$examBoard/$examId/$attemptId"
                  params={{
                    examBoard: training.examBoardId!,
                    examId: training.examBaseId,
                    attemptId: training.attemptId,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayIcon className="w-5 h-5" />}
                  >
                    {isExamInProgress ? 'Continuar prova em andamento' : 'Ir para a prova'}
                  </Button>
                </Link>
              )}
            </>
          ) : training && !training.examBoardId ? (
            <p className="text-sm text-amber-700">
              Este simulado não está vinculado a uma banca. Não é possível abrir a prova por aqui.
            </p>
          ) : null}
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-between">
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
    </>
  )
}
