import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES, getStagePath } from '../stages.config'
import { useRequireTrainingStage } from '../useRequireTrainingStage'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/retentativa')({
  component: RetentativaPage,
})

function RetentativaPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  useRequireTrainingStage(trainingId, 'retentativa')
  const stage = getStageById(4)!

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <ArrowPathIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa 4 de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <Card noElevation className="p-6">
        <p className="text-slate-600 mb-4">
          Para cada questão que você errou, você terá uma segunda chance. A alternativa que você marcou antes não será exibida.
        </p>
        <p className="text-sm text-slate-500">
          (Conteúdo placeholder — etapa Re-tentativa)
        </p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
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
