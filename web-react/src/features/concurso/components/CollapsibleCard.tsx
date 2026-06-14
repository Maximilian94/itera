import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { CARD } from './card'
import { enter } from './motion'
import type { ReactNode } from 'react'

/**
 * Card com cabeçalho clicável que expande/recolhe o corpo. Cada seção da
 * página do cargo pode ser aberta ou fechada de forma independente, pra o
 * usuário controlar o quanto rola.
 *
 * A11y: o título continua sendo um <h2> (navegável por heading); o botão de
 * toggle é "esticado" por um overlay (after:absolute) para o cabeçalho inteiro
 * ser clicável sem poluir o nome acessível do heading — que fica só o título.
 * O hover do header + o chip da seta deixam claro que é expansível.
 */
export function CollapsibleCard(props: {
  title: string
  subtitle?: string
  /** Nó à direita do título (ex.: contador "2 de 5 etapas"). */
  aside?: ReactNode
  defaultOpen?: boolean
  enterIdx?: number
  children: ReactNode
}) {
  const { title, subtitle, aside, defaultOpen = true, enterIdx = 0, children } = props
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section {...enter(enterIdx)} className={CARD}>
      <div
        className={`group relative flex cursor-pointer items-center gap-3 p-5 transition-colors hover:bg-slate-50 sm:p-6 ${
          open ? 'rounded-t-2xl border-b border-slate-100' : 'rounded-2xl'
        }`}
      >
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-base font-bold text-slate-900">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-cyan-500"
            >
              {title}
            </button>
          </h2>
          {subtitle != null && (
            <p className="mt-0.5 text-sm font-normal text-slate-500">{subtitle}</p>
          )}
        </div>
        {aside}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 group-hover:bg-slate-200 group-hover:text-slate-700 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <ChevronDownIcon className="h-5 w-5" />
        </span>
      </div>
      {open && <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>}
    </section>
  )
}
