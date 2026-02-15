import { Card } from '@/components/Card'
import { Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardDocumentListIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES, getStagePath } from './stages.config'
import { useExamBaseQueries } from '@/features/examBase/queries/examBase.queries'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'

export const Route = createFileRoute('/_authenticated/treino/prova')({
  component: ProvaPage,
})

function ProvaPage() {
  const navigate = useNavigate()
  const [selectedExamBaseId, setSelectedExamBaseId] = useState<string>('')
  const { data: examBases = [], isLoading: loadingBases } = useExamBaseQueries()
  const createMutation = useCreateTrainingMutation()
  const stage = getStageById(1)!

  const handleStart = () => {
    if (!selectedExamBaseId) return
    createMutation.mutate(selectedExamBaseId, {
      onSuccess: (res) => {
        navigate({ to: getStagePath('prova', res.trainingId) })
      },
    })
  }

  return (
    <>
      <div className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}>
            <ClipboardDocumentListIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Etapa 1 de {TREINO_STAGES.length}</p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <Card noElevation className="p-6">
        <p className="text-slate-600 mb-4">
          Escolha o simulado com o qual deseja fazer o treino. Ao iniciar, uma nova sessão será criada e você fará a prova no mesmo formato que já conhece.
        </p>
        <FormControl size="small" className="min-w-[260px]" fullWidth>
          <InputLabel id="treino-prova-exam-base-label">Simulado</InputLabel>
          <Select
            labelId="treino-prova-exam-base-label"
            label="Simulado"
            value={selectedExamBaseId}
            onChange={(e) => setSelectedExamBaseId(e.target.value)}
            disabled={loadingBases}
          >
            <MenuItem value="">
              <em>Selecione um simulado</em>
            </MenuItem>
            {examBases.map((eb) => (
              <MenuItem key={eb.id} value={eb.id}>
                {eb.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="mt-4">
          <Button
            variant="contained"
            color="primary"
            startIcon={<ClipboardDocumentListIcon className="w-5 h-5" />}
            onClick={handleStart}
            disabled={!selectedExamBaseId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Criando sessão...' : 'Iniciar prova'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          component={Link}
          to="/treino"
        >
          Voltar ao início
        </Button>
      </div>
    </>
  )
}
