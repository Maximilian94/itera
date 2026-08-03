import { useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import {
  BanknotesIcon,
  ClockIcon,
  MapPinIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { enter } from '@/features/concurso/components/motion'
import { PreferenceForm } from './PreferenceForm'
import { useUpsertPreferenceMutation } from '../queries/preference.queries'
import type { UserPreference } from '../domain/preference.types'

const RADIUS_LABEL: Partial<Record<UserPreference['mobility'], string>> = {
  MAX_30MIN: 'até 30 min',
  MAX_1H: 'até 1h',
  MAX_2H: 'até 2h',
}

/** Resumo do escopo de busca: cidade+raio, estado inteiro ou Brasil todo. */
function scopeLabel(p: UserPreference): string {
  if (p.mobility === 'ANYWHERE') return 'Brasil todo'
  if (p.mobility === 'STATE') return `${p.state} inteiro`
  return `${p.city}/${p.state} · ${RADIUS_LABEL[p.mobility]}`
}

const HORIZON_LABEL: Record<UserPreference['horizon'], string> = {
  ASAP: 'Prova o quanto antes',
  LONG_TERM: 'Preparando (1–2 anos)',
}

const salaryFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function Chip({
  icon: Icon,
  children,
}: {
  icon: typeof MapPinIcon
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </span>
  )
}

/**
 * Resumo do perfil no topo da listagem + "Editar" (dialog com o mesmo form
 * do gate). Sem a barra, o usuário ficaria preso à escolha do primeiro dia.
 */
export function PreferenceBar({ preference }: { preference: UserPreference }) {
  const [open, setOpen] = useState(false)
  const mutation = useUpsertPreferenceMutation()

  return (
    <div
      {...enter(1)}
      className="flex flex-wrap items-center gap-2"
      aria-label="Suas preferências"
    >
      <Chip icon={MapPinIcon}>{scopeLabel(preference)}</Chip>
      {preference.minSalary != null && (
        <Chip icon={BanknotesIcon}>
          ≥ {salaryFmt.format(Number(preference.minSalary))}
        </Chip>
      )}
      <Chip icon={ClockIcon}>{HORIZON_LABEL[preference.horizon]}</Chip>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
        Editar
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Suas preferências</DialogTitle>
        <DialogContent>
          <div className="pt-2">
            <PreferenceForm
              initial={preference}
              submitLabel="Salvar"
              onSubmit={(input) =>
                mutation.mutate(input, { onSuccess: () => setOpen(false) })
              }
              isSubmitting={mutation.isPending}
              errorMessage={
                mutation.isError
                  ? 'Não foi possível salvar. Tente novamente.'
                  : null
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex cursor-pointer items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  Cancelar
                </button>
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
