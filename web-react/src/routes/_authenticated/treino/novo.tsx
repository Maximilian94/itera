import { ExamBaseRow } from '@/components/ExamBaseRow'
import { PageHeader } from '@/components/PageHeader'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@mui/material'
import { ArrowLeftIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'
import { getStagePath } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/novo')({
  component: NovoPage,
})

function NovoPage() {
  const navigate = useNavigate()
  const [selectedExamBaseId, setSelectedExamBaseId] = useState<string | null>(null)
  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const createMutation = useCreateTrainingMutation()

  const handleCreateAndContinue = () => {
    if (!selectedExamBaseId) return
    createMutation.mutate(selectedExamBaseId, {
      onSuccess: (res) => {
        navigate({ to: getStagePath('prova', res.trainingId) })
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escolher concurso"
        subtitle="Selecione o concurso com o qual deseja fazer o treino. Em seguida, crie e avance para a etapa Prova."
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-800">Lista de concursos</h2>
        {isLoadingExamBases ? (
          <p className="text-sm text-slate-500">Carregando concursos...</p>
        ) : (examBases?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Nenhum concurso encontrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(examBases ?? []).map((examBase) => (
              <ExamBaseRow
                key={examBase.id}
                examBase={examBase}
                selectable
                selected={selectedExamBaseId === examBase.id}
                onSelect={() => setSelectedExamBaseId(examBase.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          component={Link}
          to="/treino"
        >
          Voltar ao início
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RocketLaunchIcon className="w-5 h-5" />}
          onClick={handleCreateAndContinue}
          disabled={!selectedExamBaseId || createMutation.isPending}
        >
          {createMutation.isPending ? 'Criando...' : 'Criar e avançar'}
        </Button>
      </div>
    </div>
  )
}
