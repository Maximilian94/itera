import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useUpdateCargoMutation } from '../queries/cargo.queries'
import type { AdminCargo } from '../domain/cargo.types'

type FichaForm = {
  role: string
  description: string
  requirements: string
  salaryBase: string
  workload: string
  vacancyCount: string
  hasReserveList: boolean
  applicantCount: string
  registrationFee: string
  minPassingGradeNonQuota: string
  actualCutScore: string
  isNursingRelevant: boolean
}

function toForm(cargo: AdminCargo): FichaForm {
  return {
    role: cargo.role,
    description: cargo.description ?? '',
    requirements: cargo.requirements ?? '',
    salaryBase: cargo.salaryBase ?? '',
    workload: cargo.workload ?? '',
    vacancyCount: cargo.vacancyCount != null ? String(cargo.vacancyCount) : '',
    hasReserveList: cargo.hasReserveList,
    applicantCount:
      cargo.applicantCount != null ? String(cargo.applicantCount) : '',
    registrationFee: cargo.registrationFee ?? '',
    minPassingGradeNonQuota: cargo.minPassingGradeNonQuota ?? '',
    actualCutScore: cargo.actualCutScore ?? '',
    isNursingRelevant: cargo.isNursingRelevant,
  }
}

/**
 * Ficha da vaga (model Cargo) editada no lugar certo — não mais na prova
 * primária (R4.3). O backend espelha nas colunas legadas da prova oficial
 * (dual-write) até a limpeza R6.1.
 */
export function CargoFichaDialog(props: {
  cargo: AdminCargo | null
  onClose: () => void
}) {
  const { cargo, onClose } = props
  const [form, setForm] = useState<FichaForm | null>(null)
  const update = useUpdateCargoMutation()

  useEffect(() => {
    setForm(cargo ? toForm(cargo) : null)
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargo?.id])

  if (cargo == null || form == null) return null
  const set = <K extends keyof FichaForm>(key: K, value: FichaForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const handleSave = () => {
    update.mutate(
      {
        cargoId: cargo.id,
        input: {
          role: form.role.trim() || undefined,
          description: form.description.trim() || null,
          requirements: form.requirements.trim() || null,
          salaryBase: form.salaryBase.trim() || null,
          workload: form.workload.trim() || null,
          vacancyCount: form.vacancyCount
            ? parseInt(form.vacancyCount, 10)
            : null,
          hasReserveList: form.hasReserveList,
          applicantCount: form.applicantCount
            ? parseInt(form.applicantCount, 10)
            : null,
          registrationFee: form.registrationFee.trim() || null,
          minPassingGradeNonQuota:
            form.minPassingGradeNonQuota.trim() || null,
          actualCutScore: form.actualCutScore.trim() || null,
          isNursingRelevant: form.isNursingRelevant,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ficha do cargo</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A ficha da vaga pertence ao CARGO (vale para todas as provas
          vinculadas) e alimenta as páginas públicas do concurso.
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Cargo (role) *"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Descrição da vaga"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            multiline
            minRows={2}
            fullWidth
            size="small"
          />
          <TextField
            label="Requisitos"
            value={form.requirements}
            onChange={(e) => set('requirements', e.target.value)}
            fullWidth
            size="small"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Salário base (R$)"
              value={form.salaryBase}
              onChange={(e) => set('salaryBase', e.target.value)}
              size="small"
            />
            <TextField
              label="Jornada"
              value={form.workload}
              onChange={(e) => set('workload', e.target.value)}
              placeholder="40h semanais"
              size="small"
            />
            <TextField
              label="Vagas"
              value={form.vacancyCount}
              onChange={(e) => set('vacancyCount', e.target.value)}
              type="number"
              size="small"
            />
            <TextField
              label="Inscritos"
              value={form.applicantCount}
              onChange={(e) => set('applicantCount', e.target.value)}
              type="number"
              size="small"
            />
            <TextField
              label="Taxa de inscrição (R$)"
              value={form.registrationFee}
              onChange={(e) => set('registrationFee', e.target.value)}
              size="small"
            />
            <TextField
              label="Nota mínima do edital (%)"
              value={form.minPassingGradeNonQuota}
              onChange={(e) => set('minPassingGradeNonQuota', e.target.value)}
              size="small"
            />
            <TextField
              label="Corte real da última vaga (%)"
              value={form.actualCutScore}
              onChange={(e) => set('actualCutScore', e.target.value)}
              size="small"
            />
          </div>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.hasReserveList}
                onChange={(e) => set('hasReserveList', e.target.checked)}
                size="small"
              />
            }
            label="Tem cadastro de reserva (CR)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isNursingRelevant}
                onChange={(e) => set('isNursingRelevant', e.target.checked)}
                size="small"
              />
            }
            label="Cargo relevante para enfermagem"
          />
          {update.isError && (
            <Alert severity="error">
              {(update.error)?.message ?? 'Erro ao salvar a ficha'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={update.isPending || form.role.trim() === ''}
          startIcon={
            update.isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : undefined
          }
        >
          Salvar ficha
        </Button>
      </DialogActions>
    </Dialog>
  )
}
