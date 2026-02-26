import { AccessGate } from '@/components/AccessGate'
import { Card } from '@/components/Card'
import { StartExamDialog } from '@/components/StartExamDialog'
import { Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardDocumentListIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES, getStagePath } from './-stages.config'
import { useExamBaseQueries } from '@/features/examBase/queries/examBase.queries'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useQuestionsCountBySubjectQuery } from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'

export const Route = createFileRoute('/_authenticated/treino/prova')({
  /** Training exam selection page. Requires plan with trainings (Estratégico/Elite). */
  component: () => (
    <AccessGate type="treino">
      <ProvaPage />
    </AccessGate>
  ),
})

function ProvaPage() {
  const navigate = useNavigate()
  const [selectedExamBaseId, setSelectedExamBaseId] = useState<string>('')
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const { data: examBases = [], isLoading: loadingBases } = useExamBaseQueries()
  const createMutation = useCreateTrainingMutation()
  const { data: subjectStats = [], isLoading: isLoadingSubjectStats } =
    useQuestionsCountBySubjectQuery(selectedExamBaseId || undefined)
  const stage = getStageById(1)!

  const handleOpenStart = () => {
    if (!selectedExamBaseId) return
    setStartDialogOpen(true)
  }

  const handleStart = (subjectFilter: string[]) => {
    if (!selectedExamBaseId) return
    createMutation.mutate(
      { examBaseId: selectedExamBaseId, subjectFilter },
      {
        onSuccess: (res) => {
          setStartDialogOpen(false)
          navigate({ to: getStagePath('prova', res.trainingId) })
        },
      },
    )
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
                {eb.institution ?? eb.name}
                {!(eb.published ?? true) && (
                  <span className="ml-1.5 text-amber-600 text-xs">(Rascunho)</span>
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="mt-4">
          <Button
            variant="contained"
            color="primary"
            startIcon={<ClipboardDocumentListIcon className="w-5 h-5" />}
            onClick={handleOpenStart}
            disabled={!selectedExamBaseId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Criando sessão...' : 'Iniciar prova'}
          </Button>
        </div>
      </Card>

      <StartExamDialog
        open={startDialogOpen}
        onClose={() => setStartDialogOpen(false)}
        onConfirm={handleStart}
        subjectStats={subjectStats}
        isLoading={isLoadingSubjectStats}
        isSubmitting={createMutation.isPending}
        title="Como deseja fazer o treino?"
        confirmLabel="Iniciar treino"
      />

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
