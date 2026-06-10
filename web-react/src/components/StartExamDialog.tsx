import { Button, Dialog, DialogActions, DialogContent } from '@mui/material'
import {
  AdjustmentsHorizontalIcon,
  BoltIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export type StartExamDialogMode = 'full' | 'subjects'

export interface StartExamDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (subjectFilter: Array<string>, immediateFeedback: boolean) => void
  subjectStats: Array<{ subject: string; count: number }>
  isLoading?: boolean
  isSubmitting?: boolean
  /** Title for the dialog (e.g. "Iniciar prova" or "Iniciar treino") */
  title?: string
  /** Label for confirm button (e.g. "Iniciar prova" or "Iniciar treino") */
  confirmLabel?: string
  fullScreen?: boolean
  /**
   * When true, shows the "immediate feedback" choice (training prova flow only).
   * Default false — the avulsa exam flow has no immediate-feedback phase.
   */
  showImmediateFeedbackToggle?: boolean
}

/**
 * Selectable radio-card tile: icon + title + description with a cyan selected
 * state. Shared vocabulary for every choice in this dialog so the affordance is
 * consistent (see DESIGN.md — one accent, consistent component vocabulary).
 */
function OptionTile({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
        selected
          ? 'border-cyan-500 bg-cyan-50/70'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          selected
            ? 'bg-cyan-600 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${
            selected ? 'text-cyan-900' : 'text-slate-800'
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {description}
        </span>
      </span>
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
          selected ? 'border-cyan-600 bg-cyan-600' : 'border-slate-300'
        }`}
      >
        {selected && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </p>
  )
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
  fullScreen = false,
  showImmediateFeedbackToggle = false,
}: StartExamDialogProps) {
  const [mode, setMode] = useState<StartExamDialogMode>('full')
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    new Set(),
  )
  const [immediateFeedback, setImmediateFeedback] = useState(true)

  const hasSubjects = subjectStats.length > 0
  const allSelected =
    hasSubjects && selectedSubjects.size === subjectStats.length

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
    if (allSelected) {
      setSelectedSubjects(new Set())
    } else {
      setSelectedSubjects(new Set(subjectStats.map((s) => s.subject)))
    }
  }

  const handleConfirm = () => {
    const subjectFilter = mode === 'full' ? [] : [...selectedSubjects]
    onConfirm(subjectFilter, immediateFeedback)
  }

  const canConfirm = mode === 'full' || selectedSubjects.size > 0

  const handleClose = () => {
    setMode('full')
    setSelectedSubjects(new Set())
    setImmediateFeedback(true)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : '16px',
            boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18)',
          },
        },
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
          <ClipboardDocumentListIcon className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>
      </div>

      <DialogContent dividers sx={{ px: 3, py: 3, borderColor: '#e2e8f0' }}>
        {isLoading ? (
          <div className="flex flex-col gap-3" aria-hidden>
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="h-[68px] animate-pulse rounded-xl bg-slate-100" />
              <div className="h-[68px] animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Matérias */}
            <section className="flex flex-col gap-3">
              <SectionLabel>Matérias</SectionLabel>
              {!hasSubjects ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Esta prova não tem matérias definidas. Você fará a prova
                  completa.
                </p>
              ) : (
                <>
                  <div
                    role="radiogroup"
                    aria-label="Escopo da prova"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <OptionTile
                      icon={Squares2X2Icon}
                      title="Prova completa"
                      description="Todas as matérias do concurso."
                      selected={mode === 'full'}
                      onClick={() => setMode('full')}
                    />
                    <OptionTile
                      icon={AdjustmentsHorizontalIcon}
                      title="Escolher matérias"
                      description="Foque nos assuntos que quiser."
                      selected={mode === 'subjects'}
                      onClick={() => setMode('subjects')}
                    />
                  </div>

                  {mode === 'subjects' && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {selectedSubjects.size > 0
                            ? `${selectedSubjects.size} selecionada${selectedSubjects.size > 1 ? 's' : ''}`
                            : 'Selecione ao menos uma matéria'}
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                        >
                          {allSelected ? 'Limpar' : 'Selecionar todas'}
                        </button>
                      </div>
                      <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
                        {subjectStats.map(({ subject, count }) => {
                          const isSel = selectedSubjects.has(subject)
                          return (
                            <button
                              key={subject}
                              type="button"
                              aria-pressed={isSel}
                              onClick={() => handleToggleSubject(subject)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
                                isSel
                                  ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {subject}
                              <span
                                className={`tabular-nums ${isSel ? 'text-cyan-600' : 'text-slate-400'}`}
                              >
                                {count}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Feedback */}
            {showImmediateFeedbackToggle && (
              <section className="flex flex-col gap-3">
                <SectionLabel>Feedback</SectionLabel>
                <div
                  role="radiogroup"
                  aria-label="Quando mostrar o feedback"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  <OptionTile
                    icon={BoltIcon}
                    title="Imediato"
                    description="Resposta e explicação após cada questão."
                    selected={immediateFeedback}
                    onClick={() => setImmediateFeedback(true)}
                  />
                  <OptionTile
                    icon={FlagIcon}
                    title="No final"
                    description="Gabarito só ao terminar, como no concurso."
                    selected={!immediateFeedback}
                    onClick={() => setImmediateFeedback(false)}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting}
          color="inherit"
          sx={{ color: '#475569', textTransform: 'none', fontWeight: 600 }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm || isSubmitting}
          disableElevation
          sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
        >
          {isSubmitting ? 'Iniciando…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
