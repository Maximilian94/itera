import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  BookOpenIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  AcademicCapIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getStageById, TREINO_STAGES, getStagePath } from '../stages.config'
import { useRequireTrainingStage } from '../useRequireTrainingStage'
import {
  useTrainingStudyItemsQuery,
  useCompleteStudyItemMutation,
  useGenerateStudyItemContentMutation,
  useUpdateTrainingStageMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/estudo')({
  component: EstudoPage,
})

function EstudoPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  useRequireTrainingStage(trainingId, 'estudo')
  const stage = getStageById(3)!

  const { data: studyItems = [], isLoading } = useTrainingStudyItemsQuery(trainingId)
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId)

  const total = studyItems.length
  const concluidos = studyItems.filter((i) => i.completedAt).length
  const pendentes = total - concluidos
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const temPendentes = pendentes > 0

  const handleIrParaRetentativa = () => {
    if (temPendentes) {
      setDialogOpen(true)
    } else {
      goToRetentativa()
    }
  }

  const goToRetentativa = async () => {
    setDialogOpen(false)
    try {
      await updateStageMutation.mutateAsync('RETRY')
      await queryClient.refetchQueries({ queryKey: trainingKeys.one(trainingId) })
      navigate({ to: getStagePath('retentativa', trainingId) })
    } catch {
      // erro já tratado pela mutation
    }
  }

  return (
    <>
      <div
        className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}
          >
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Etapa 3 de {TREINO_STAGES.length}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm">
        Estude cada assunto recomendado pelo diagnóstico: leia a mini-explicação
        e faça os exercícios. Marque como &quot;pronto&quot; quando terminar ou pule
        para a próxima etapa quando quiser.
      </p>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Carregando itens de estudo...</p>
      ) : (
        <>
          <Card noElevation className="p-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">
                  {concluidos} de {total} assuntos concluídos
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-[120px]">
                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 w-8">
                  {progresso}%
                </span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {studyItems.map((item) => (
              <StudyItemCard
                key={item.id}
                trainingId={trainingId}
                item={item}
              />
            ))}
          </div>

          {studyItems.length === 0 && (
            <Card noElevation className="p-6 border-dashed border-2 border-slate-300">
              <p className="text-slate-600 text-sm">
                Nenhum item de estudo ainda. Avance para o diagnóstico e conclua a prova para gerar as recomendações.
              </p>
            </Card>
          )}
        </>
      )}

      <Card noElevation className="p-4 border-dashed border-2 border-slate-300 bg-slate-50/50">
        <p className="text-sm text-slate-600">
          Você pode seguir para a <strong>Re-tentativa</strong> mesmo sem ter
          concluído todos os assuntos. O que já foi marcado como pronto fica
          registrado.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: getStagePath('diagnostico', trainingId) })}
        >
          Voltar: Diagnóstico
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={handleIrParaRetentativa}
          disabled={updateStageMutation.isPending}
        >
          {updateStageMutation.isPending ? 'Avançando...' : 'Próxima: Re-tentativa'}
        </Button>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ir para Re-tentativa?</DialogTitle>
        <DialogContent>
          <p className="text-slate-700 mb-2">
            Você ainda tem <strong>{pendentes} {pendentes === 1 ? 'assunto' : 'assuntos'}</strong> de estudo não concluídos.
          </p>
          <p className="text-slate-600 text-sm mb-2">
            Não é obrigatório terminar todos antes de seguir — você pode ir para a Re-tentativa agora e testar o que já estudou. Porém, concluir os assuntos pendentes costuma melhorar seu desempenho na segunda chance nas questões.
          </p>
          <p className="text-slate-600 text-sm">
            Se preferir, pode continuar estudando e marcar como &quot;pronto&quot; quando terminar. Você também pode voltar a esta etapa depois, a partir do menu.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Continuar no estudo
          </Button>
          <Button variant="contained" color="primary" onClick={goToRetentativa} disabled={updateStageMutation.isPending}>
            {updateStageMutation.isPending ? 'Avançando...' : 'Ir para Re-tentativa'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function StudyItemCard({
  trainingId,
  item,
}: {
  trainingId: string
  item: import('@/features/training/domain/training.types').TrainingStudyItemResponse
}) {
  const isPronto = Boolean(item.completedAt)
  const completeMutation = useCompleteStudyItemMutation(trainingId, item.id)
  const generateMutation = useGenerateStudyItemContentMutation(trainingId, item.id)
  const hasContent = Boolean(item.explanation) || (item.exercises?.length ?? 0) > 0

  const togglePronto = () => {
    completeMutation.mutate(!isPronto)
  }

  return (
    <Card
      noElevation
      className={`overflow-hidden border-2 transition-colors ${
        isPronto
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {isPronto ? (
              <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-6 h-6 text-emerald-700" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <AcademicCapIcon className="w-5 h-5 text-slate-600" />
              </div>
            )}
            <h3 className="text-base font-semibold text-slate-800">
              {item.topic ? `${item.subject} — ${item.topic}` : item.subject}
            </h3>
          </div>
          <Button
            size="small"
            variant={isPronto ? 'outlined' : 'contained'}
            color={isPronto ? 'success' : 'primary'}
            startIcon={
              isPronto ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <CheckIcon className="w-4 h-4" />
              )
            }
            onClick={togglePronto}
            disabled={completeMutation.isPending}
          >
            {isPronto ? 'Pronto' : 'Marcar pronto'}
          </Button>
        </div>

        <div className="mt-4 pl-[52px] min-w-0 sm:pl-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Avaliação e recomendações
          </p>
          <div className="text-sm text-slate-700 space-y-2">
            <Markdown>{item.evaluation}</Markdown>
            <Markdown>{item.recommendations}</Markdown>
          </div>
        </div>

        {!hasContent && (
          <div className="mt-4 pt-4 border-t border-slate-200 pl-[52px] sm:pl-0">
            <Button
              size="small"
              variant="outlined"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Gerando...' : 'Gerar explicação e exercícios (IA)'}
            </Button>
          </div>
        )}

        {item.explanation && (
          <div className="mt-4 pt-4 border-t border-slate-200 pl-[52px] sm:pl-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Mini-explicação
            </p>
            <div className="text-sm text-slate-700">
              <Markdown>{item.explanation}</Markdown>
            </div>
          </div>
        )}

        {item.exercises && item.exercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 pl-[52px] sm:pl-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <PencilSquareIcon className="w-4 h-4" />
              Exercícios ({item.exercises.length})
            </p>
            <div className="flex flex-col gap-3">
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
          </div>
        )}
      </div>
    </Card>
  )
}
