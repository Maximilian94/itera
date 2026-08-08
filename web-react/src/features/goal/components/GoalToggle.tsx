import { useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import { CheckIcon, ChevronDownIcon, FlagIcon } from '@heroicons/react/24/outline'
import {
  useArchiveGoalMutation,
  useCreateGoalMutation,
  useGoalsQuery,
} from '../queries/goal.queries'

/**
 * Entrada/saída da meta na página do cargo: "Definir como meta" cria o vínculo
 * (grátis, não gasta cota — a home passa a ancorar neste cargo); com meta
 * ativa vira o chip "Sua meta" com o menu "Parar de treinar". Começar um
 * treino também cria a meta implicitamente (backend).
 */
export function GoalToggle({
  cargoId,
  cargoSlug,
  provaExamBaseIds,
}: {
  /** `cargo.id` do payload (id da prova oficial ou do Cargo). */
  cargoId: string
  cargoSlug: string | null
  provaExamBaseIds: string[]
}) {
  const { data } = useGoalsQuery()
  const createGoal = useCreateGoalMutation()
  const archiveGoal = useArchiveGoalMutation()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  // Fail-quiet: sem a lista (carregando/erro), o header fica sem o toggle.
  if (data == null) return null

  const provaSet = new Set(provaExamBaseIds)
  const goal = data.goals.find(
    (g) =>
      (cargoSlug != null && g.cargo.slug === cargoSlug) ||
      g.cargo.id === cargoId ||
      g.provaExamBaseIds.some((id) => id === cargoId || provaSet.has(id)),
  )

  if (!goal) {
    return (
      <button
        type="button"
        disabled={createGoal.isPending}
        onClick={() => createGoal.mutate({ cargoSlug: cargoSlug ?? cargoId })}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-60"
      >
        <FlagIcon aria-hidden className="h-3.5 w-3.5" />
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
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 transition-colors hover:bg-cyan-100"
      >
        <CheckIcon aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
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
