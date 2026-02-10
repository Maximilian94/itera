import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CheckIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getStagePath } from '../../stages.config'
import {
  useTrainingStudyItemsQuery,
  useCompleteStudyItemMutation,
  useGenerateStudyItemContentMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/estudo/$studyItemId')({
  component: StudyItemDetailPage,
})

function StudyItemDetailPage() {
  const { trainingId, studyItemId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: studyItems = [], isLoading } = useTrainingStudyItemsQuery(trainingId)
  const item = studyItems.find((i) => i.id === studyItemId)
  const completeMutation = useCompleteStudyItemMutation(trainingId, studyItemId)
  const generateMutation = useGenerateStudyItemContentMutation(trainingId, studyItemId)
  const hasContent = Boolean(item?.explanation) || (item?.exercises?.length ?? 0) > 0
  const isPronto = Boolean(item?.completedAt)

  const handleVoltarEstudo = () => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.studyItems(trainingId) })
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    navigate({ to: '/treino/$trainingId/estudo', params: { trainingId } })
  }

  const togglePronto = () => {
    completeMutation.mutate(!isPronto, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
      },
    })
  }

  if (isLoading) {
    return <p className="text-slate-500 text-sm">Carregando...</p>
  }

  if (!item) {
    return (
      <>
        <p className="text-slate-600 text-sm">Item de estudo não encontrado.</p>
        <Button variant="outlined" startIcon={<ArrowLeftIcon className="w-5 h-5" />} onClick={handleVoltarEstudo}>
          Voltar: Estudo
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{item.subject}</p>
          <h1 className="text-xl font-bold text-slate-900">{item.recommendationTitle}</h1>
        </div>
        <Button
          variant={isPronto ? 'outlined' : 'contained'}
          color={isPronto ? 'success' : 'primary'}
          startIcon={isPronto ? <CheckCircleIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
          onClick={togglePronto}
          disabled={completeMutation.isPending}
        >
          {isPronto ? 'Pronto' : 'Marcar pronto'}
        </Button>
      </div>

      <Card noElevation className="p-5 border border-slate-200">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Recomendação
        </p>
        <div className="text-sm text-slate-700">
          <Markdown>{item.recommendationText}</Markdown>
        </div>
      </Card>

      {!hasContent && (
        <Card noElevation className="p-5 border border-slate-200 border-dashed">
          <p className="text-sm text-slate-600 mb-3">
            Gere uma explicação e exercícios com base nesta recomendação (usando IA).
          </p>
          <Button
            variant="outlined"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Gerando...' : 'Gerar explicação e exercícios (IA)'}
          </Button>
        </Card>
      )}

      {item.explanation && (
        <Card noElevation className="p-5 border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Explicação
          </p>
          <div className="text-sm text-slate-700">
            <Markdown>{item.explanation}</Markdown>
          </div>
        </Card>
      )}

      {item.exercises && item.exercises.length > 0 && (
        <Card noElevation className="p-5 border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <PencilSquareIcon className="w-4 h-4" />
            Exercícios ({item.exercises.length})
          </p>
          <div className="flex flex-col gap-4">
            {item.exercises.map((ex) => (
              <div
                key={ex.id}
                className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm"
              >
                <p className="font-medium text-slate-700 mb-2">Questão {ex.order}</p>
                <p className="text-slate-600 mb-2">{ex.statement}</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  {ex.alternatives.map((alt) => (
                    <li key={alt.id}>
                      <span className="font-medium">{alt.key}.</span> {alt.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={handleVoltarEstudo}
        >
          Voltar: Estudo
        </Button>
      </div>
    </>
  )
}
