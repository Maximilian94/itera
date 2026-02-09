import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES, getStagePath } from '../../stages.config'
import { useTrainingQuery } from '@/features/training/queries/training.queries'

export const Route = createFileRoute(
  '/_authenticated/treino/$trainingId/retentativa/',
)({
  component: RetentativaIndexPage,
})

function RetentativaIndexPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const stage = getStageById(4)!
  const { data: training, isLoading } = useTrainingQuery(trainingId)

  return (
    <>
      {/* <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
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
      </div> */}

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <Card noElevation className="p-6">
          {training?.examTitle && (
            <p className="text-slate-700 font-medium mb-3">{training.examTitle}</p>
          )}
          {training?.retryFinishedAt ? (
            <>
              <p className="text-slate-600 mb-4">
                Você finalizou a re-tentativa. Pode revisar suas respostas abaixo ou ir direto para o resultado final.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/treino/$trainingId/retentativa/prova"
                  params={{ trainingId }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<PlayIcon className="w-5 h-5" />}
                  >
                    Revisar prova da re-tentativa
                  </Button>
                </Link>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircleIcon className="w-5 h-5" />}
                  onClick={() => navigate({ to: getStagePath('final', trainingId) })}
                >
                  Ver resultado final
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600 mb-4">
                Para cada questão que você errou, você terá uma segunda chance. Acesse a prova da re-tentativa para refazer apenas as questões erradas no mesmo formato do simulado.
              </p>
              <Link
                to="/treino/$trainingId/retentativa/prova"
                params={{ trainingId }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayIcon className="w-5 h-5" />}
                >
                  Ir para a prova da re-tentativa
                </Button>
              </Link>
            </>
          )}
        </Card>
      )}

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
