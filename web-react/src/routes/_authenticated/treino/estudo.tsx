import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BookOpenIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/estudo')({
  component: EstudoPage,
})

const MOCK_TOPICS = [
  { id: '1', name: 'Direito Constitucional', done: false },
  { id: '2', name: 'Raciocínio Lógico', done: false },
  { id: '3', name: 'Informática', done: false },
]

function EstudoPage() {
  const navigate = useNavigate()
  const stage = getStageById(3)!

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa 3 de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <Card noElevation className="p-6">
        <p className="text-slate-600 mb-4">
          Para cada assunto recomendado: mini-explicação e exercícios. Marque como &quot;pronto&quot; ao concluir ou pule para a próxima etapa.
        </p>
        <ul className="space-y-2 mb-4">
          {MOCK_TOPICS.map((topic) => (
            <li
              key={topic.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
            >
              <span className="flex-1 font-medium text-slate-800">{topic.name}</span>
              <Button size="small" variant="outlined" startIcon={<CheckIcon className="w-4 h-4" />}>
                Marcar pronto
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-500">(Placeholder — lista de assuntos e exercícios)</p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/diagnostico' })}
        >
          Voltar: Diagnóstico
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/retentativa' })}
        >
          Próxima: Re-tentativa
        </Button>
      </div>
    </>
  )
}
