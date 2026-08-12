import { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import {
  CheckIcon,
  ChevronDownIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { FlagIcon as FlagSolidIcon } from '@heroicons/react/24/solid'
import {
  useArchiveGoalMutation,
  useCreateGoalMutation,
  useGoalsQuery,
} from '../queries/goal.queries'

/**
 * "Definir como meta" no NÍVEL DO CONCURSO — a mesma meta (`UserGoal`), criada
 * um nível acima do cargo. O backend resolve o concurso para o cargo de
 * enfermagem representante; a correspondência com uma meta existente é feita
 * por concurso (id/slug). Duas variantes:
 *  - `button`: pílula "Definir como meta" / "Sua meta ▾" (header do concurso);
 *  - `pin`: alternador de bandeira, um clique liga/desliga (card da lista).
 */
export function ConcursoGoalToggle({
  concursoId,
  concursoSlug,
  target,
  name,
  variant = 'button',
}: {
  /** Concurso.id do payload (null até o lazy-link rodar). */
  concursoId: string | null
  /** Concurso.slug do payload (pode ser null). */
  concursoSlug: string | null
  /** O que enviar ao POST /goals — id/slug do concurso (o backend resolve o cargo). */
  target: string
  /** Nome do concurso, para o aria-label do pin. */
  name?: string
  variant?: 'button' | 'pin'
}) {
  const { data } = useGoalsQuery()
  const createGoal = useCreateGoalMutation()
  const archiveGoal = useArchiveGoalMutation()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  // Fail-quiet: sem a lista (carregando/erro), não renderiza o controle.
  if (data == null) return null

  const goal = data.goals.find(
    (g) =>
      (concursoId != null && g.concurso.id === concursoId) ||
      (concursoSlug != null && g.concurso.slug === concursoSlug),
  )
  const busy = createGoal.isPending || archiveGoal.isPending

  if (variant === 'pin') {
    const isMeta = goal != null
    return (
      <button
        type="button"
        disabled={busy}
        aria-pressed={isMeta}
        aria-label={
          isMeta
            ? `Sua meta${name ? `: ${name}` : ''} — remover`
            : `Definir${name ? ` ${name}` : ''} como meta`
        }
        onClick={() =>
          isMeta
            ? archiveGoal.mutate(goal.id)
            : createGoal.mutate({ cargoSlug: target })
        }
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
          isMeta
            ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
            : 'border-slate-200 bg-white text-slate-400 hover:border-cyan-300 hover:text-cyan-600'
        }`}
      >
        {isMeta ? (
          <FlagSolidIcon className="h-4 w-4" />
        ) : (
          <FlagIcon className="h-4 w-4" />
        )}
      </button>
    )
  }

  if (!goal) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => createGoal.mutate({ cargoSlug: target })}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <FlagIcon aria-hidden className="h-4 w-4" />
        {createGoal.isPending ? 'Definindo…' : 'Definir como meta'}
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Sua meta — opções"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-sm font-bold text-cyan-800 transition-colors hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <CheckIcon aria-hidden className="h-4 w-4" strokeWidth={3} />
        Sua meta
        <ChevronDownIcon aria-hidden className="h-3 w-3" />
      </button>
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor != null}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          disabled={archiveGoal.isPending}
          onClick={() => {
            setMenuAnchor(null)
            archiveGoal.mutate(goal.id)
          }}
        >
          Parar de treinar este concurso
        </MenuItem>
      </Menu>
    </>
  )
}
