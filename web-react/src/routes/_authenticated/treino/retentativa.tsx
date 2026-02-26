import { Card } from '@/components/Card'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowPathIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from './-stages.config'

export const Route = createFileRoute('/_authenticated/treino/retentativa')({
  component: RetentativaPage,
})

function RetentativaPage() {
  const navigate = useNavigate()
  const stage = getStageById(4)!

  return (
    <>
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
          onClick={() => navigate({ to: '/treino/estudo' })}
        >
          Voltar: Estudo
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/final' })}
        >
          Próxima: Final
        </Button>
      </div>
    </>
  )
}
