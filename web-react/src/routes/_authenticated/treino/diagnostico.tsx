import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChartBarIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/diagnostico')({
  component: DiagnosticoPage,
})

function DiagnosticoPage() {
  const navigate = useNavigate()
  const stage = getStageById(2)!

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <ChartBarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa 2 de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <Card noElevation className="p-6">
        <p className="text-slate-600 mb-4">
          Aqui você vê o feedback do desempenho na prova: por assunto, acertos e erros, e recomendações do que estudar.
        </p>
        <p className="text-sm text-slate-500">
          (Conteúdo placeholder — etapa Diagnóstico)
        </p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/prova' })}
        >
          Voltar: Prova
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/estudo' })}
        >
          Próxima: Estudo
        </Button>
      </div>
    </>
  )
}
