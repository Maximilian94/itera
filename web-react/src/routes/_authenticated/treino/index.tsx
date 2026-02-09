import { Card } from '@/components/Card'
import { CheckCircleIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { Button } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import { TREINO_STAGES } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/')({
  component: TreinoIndexPage,
})

function TreinoIndexPage() {
  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Treino</h1>
        <p className="text-sm text-slate-500 mt-1">
          Em vez de só fazer uma prova e receber feedback, o Treino é um processo completo: prova → diagnóstico → estudo → re-tentativa → resultado final.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {TREINO_STAGES.map((stage) => {
          const Icon = stage.icon
          return (
            <Card key={stage.id} noElevation className={`overflow-hidden border-l-4 ${stage.borderColor}`}>
              <div className="flex gap-4 p-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stage.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-400">Etapa {stage.id}</span>
                    <h3 className="text-base font-semibold text-slate-800">{stage.title}</h3>
                    <span className="text-sm text-slate-500">— {stage.subtitle}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{stage.description}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card noElevation className="p-5 border-dashed border-2 border-slate-300 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-7 h-7 text-slate-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-700">Iniciar treino</h3>
            <p className="text-sm text-slate-500 mt-1">
              Escolha um simulado e comece pela Etapa 1 — Prova. Você pode navegar pelas etapas pelo menu acima.
            </p>
          </div>
          <Link to="/treino/prova">
            <Button variant="contained" color="primary" startIcon={<ClipboardDocumentListIcon className="w-5 h-5" />}>
              Ir para Prova
            </Button>
          </Link>
        </div>
      </Card>
    </>
  )
}
