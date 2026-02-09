import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/final')({
  component: FinalPage,
})

function FinalPage() {
  const navigate = useNavigate()
  const stage = getStageById(5)!

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa {TREINO_STAGES.length} de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <Card noElevation className="p-6">
        <p className="text-slate-600 mb-4">
          Aqui mostramos a nota inicial, a nota antes dos estudos e a nota final depois dos estudos — reforçando a sensação de progresso.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="p-4 rounded-lg bg-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-700">—</p>
            <p className="text-sm text-slate-500">Nota inicial</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 text-center">
            <p className="text-2xl font-bold text-amber-700">—</p>
            <p className="text-sm text-slate-500">Antes dos estudos</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 text-center">
            <p className="text-2xl font-bold text-emerald-700">—</p>
            <p className="text-sm text-slate-500">Nota final</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">(Placeholder — valores virão da API)</p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/retentativa' })}
        >
          Voltar: Re-tentativa
        </Button>
        <Button variant="contained" color="primary" onClick={() => navigate({ to: '/treino' })}>
          Concluir e voltar ao início
        </Button>
      </div>
    </>
  )
}
