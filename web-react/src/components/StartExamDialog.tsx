import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from '@mui/material'
import { useState } from 'react'

export type StartExamDialogMode = 'full' | 'subjects'

export interface StartExamDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (subjectFilter: string[]) => void
  subjectStats: Array<{ subject: string; count: number }>
  isLoading?: boolean
  isSubmitting?: boolean
  /** Title for the dialog (e.g. "Iniciar prova" or "Iniciar treino") */
  title?: string
  /** Label for confirm button (e.g. "Iniciar prova" or "Iniciar treino") */
  confirmLabel?: string
}

export function StartExamDialog({
  open,
  onClose,
  onConfirm,
  subjectStats,
  isLoading = false,
  isSubmitting = false,
  title = 'Como deseja fazer a prova?',
  confirmLabel = 'Iniciar prova',
}: StartExamDialogProps) {
  const [mode, setMode] = useState<StartExamDialogMode>('full')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    new Set(),
  )

  const hasSubjects = subjectStats.length > 0

  const handleToggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(subject)) {
        next.delete(subject)
      } else {
        next.add(subject)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedSubjects.size === subjectStats.length) {
      setSelectedSubjects(new Set())
    } else {
      setSelectedSubjects(new Set(subjectStats.map((s) => s.subject)))
    }
  }

  const handleConfirm = () => {
    if (mode === 'full') {
      onConfirm([])
    } else {
      onConfirm([...selectedSubjects])
    }
  }

  const canConfirm =
    mode === 'full' || (mode === 'subjects' && selectedSubjects.size > 0)

  const handleClose = () => {
    setMode('full')
    setSelectedSubjects(new Set())
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <div className="py-4 text-slate-500 text-sm animate-pulse">
            Carregando matérias...
          </div>
        ) : !hasSubjects ? (
          <p className="text-slate-600 text-sm py-2">
            Esta prova não possui questões com matéria definida. Você fará a
            prova completa.
          </p>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <RadioGroup
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as StartExamDialogMode)
              }
            >
              <FormControlLabel
                value="full"
                control={<Radio />}
                label="Prova completa (todas as matérias)"
              />
              <FormControlLabel
                value="subjects"
                control={<Radio />}
                label="Selecionar matérias"
              />
            </RadioGroup>

            {mode === 'subjects' && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    Matérias
                  </span>
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleSelectAll}
                    sx={{ textTransform: 'none' }}
                  >
                    {selectedSubjects.size === subjectStats.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Button>
                </div>
                <FormGroup className="max-h-48 overflow-y-auto">
                  {subjectStats.map(({ subject, count }) => (
                    <FormControlLabel
                      key={subject}
                      control={
                        <Checkbox
                          checked={selectedSubjects.has(subject)}
                          onChange={() => handleToggleSubject(subject)}
                          size="small"
                        />
                      }
                      label={
                        <span className="text-sm">
                          {subject} ({count}{' '}
                          {count === 1 ? 'questão' : 'questões'})
                        </span>
                      }
                    />
                  ))}
                </FormGroup>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm || isSubmitting}
        >
          {isSubmitting ? 'Iniciando…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
