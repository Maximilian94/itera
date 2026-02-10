import { Card } from '@/components/Card'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getStagePath } from '../../stages.config'
import {
  useTrainingStudyItemsQuery,
  useUpdateTrainingStageMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'
import type { TrainingStudyItemResponse } from '@/features/training/domain/training.types'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/estudo/')({
  component: EstudoListPage,
})

function EstudoListPage() {
  const { trainingId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: studyItems = [], isLoading } = useTrainingStudyItemsQuery(trainingId)
  const updateStageMutation = useUpdateTrainingStageMutation(trainingId)

  const total = studyItems.length
  const concluidos = studyItems.filter((i) => i.completedAt).length
  const pendentes = total - concluidos
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0
  const temPendentes = pendentes > 0

  const studyItemsBySubject = useMemo(() => {
    const bySubject = new Map<string, TrainingStudyItemResponse[]>()
    for (const item of studyItems) {
      const list = bySubject.get(item.subject) ?? []
      list.push(item)
      bySubject.set(item.subject, list)
    }
    return Array.from(bySubject.entries())
      .map(([subject, items]) => ({ subject, items }))
      .sort((a, b) => a.subject.localeCompare(b.subject))
  }, [studyItems])

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
      <p className="text-slate-600 text-sm">
        Estude cada recomendação do diagnóstico. Clique em <strong>Estudar</strong> para abrir a
        explicação e os exercícios. As recomendações estão agrupadas por matéria.
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
                  {concluidos} de {total} recomendações concluídas
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

          {studyItemsBySubject.length > 0 ? (
            <div className="flex flex-col gap-6">
              {studyItemsBySubject.map(({ subject, items }) => (
                <div key={subject} className="flex flex-col gap-3">
                  <h3 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    {subject}
                  </h3>
                  <ul className="flex flex-col gap-2 list-none p-0 m-0">
                    {items.map((item) => (
                      <StudyItemRow key={item.id} trainingId={trainingId} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
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
          concluído todas as recomendações. O que já foi marcado como pronto fica
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
            Você ainda tem <strong>{pendentes} {pendentes === 1 ? 'recomendação' : 'recomendações'}</strong> de estudo não concluídas.
          </p>
          <p className="text-slate-600 text-sm mb-2">
            Não é obrigatório terminar todas antes de seguir — você pode ir para a Re-tentativa agora e testar o que já estudou. Porém, concluir as recomendações pendentes costuma melhorar seu desempenho na segunda chance nas questões.
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

function StudyItemRow({
  trainingId,
  item,
}: {
  trainingId: string
  item: TrainingStudyItemResponse
}) {
  const isPronto = Boolean(item.completedAt)

  return (
    <li>
      <Card
        className={`overflow-hidden transition-colors cursor-pointer group ${
          isPronto ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
        }`}
      >
        <Link
          to="/treino/$trainingId/estudo/$studyItemId"
          params={{ trainingId, studyItemId: item.id }}
          className="flex items-center gap-3 no-underline text-inherit"
        >
          {isPronto ? (
            <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-6 h-6 text-emerald-700" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors duration-200">
              <AcademicCapIcon className="w-5 h-5 text-slate-600 group-hover:text-slate-700" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">{item.subject}</p>
            <h3 className="text-base font-semibold text-slate-800 truncate">
              {item.recommendationTitle}
            </h3>
          </div>
          <span className="text-sm font-medium text-slate-500 shrink-0">
            {isPronto ? 'Concluído' : 'Pendente'}
          </span>
          <ChevronRightIcon className="w-5 h-5 text-slate-400 shrink-0" />
        </Link>
      </Card>
    </li>
  )
}
