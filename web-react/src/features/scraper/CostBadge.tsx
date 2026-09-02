/** Custo de IA de uma operação: valor total + detalhe por chamada.
 *  Existe para o admin ver o preço do clique na hora, em vez de descobrir no
 *  painel da OpenAI no dia seguinte e agregado. */
import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import type { CostReport } from './scraper.types'

/** Centavos de dólar são a escala real aqui — 4 casas evita mostrar "$0.00". */
export function formatUsd(usd: number): string {
  if (usd === 0) return 'US$ 0'
  if (usd < 0.0001) return '< US$ 0,0001'
  return `US$ ${usd.toFixed(4).replace('.', ',')}`
}

const int = new Intl.NumberFormat('pt-BR')

export function CostBadge({
  cost,
  className = '',
}: {
  cost: CostReport
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (cost.entries.length === 0) return null

  return (
    <div className={`text-xs ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Custo: <strong className="tabular-nums">{formatUsd(cost.usd)}</strong>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="mt-1.5 flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {cost.entries.map((e, i) => (
            <li
              key={`${e.label}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
            >
              <span className="text-slate-600">{e.label}</span>
              <span className="tabular-nums text-slate-500">
                {e.inputTokens > 0 || e.outputTokens > 0
                  ? `${int.format(e.inputTokens)} in / ${int.format(e.outputTokens)} out · `
                  : ''}
                {formatUsd(e.usd)}
              </span>
            </li>
          ))}
          {/* A taxa da busca web não vem na resposta da API — é estimada. */}
          <li className="mt-0.5 border-t border-slate-200 pt-1 text-[11px] text-slate-400">
            A taxa por chamada da busca web é estimada; os tokens são medidos.
          </li>
        </ul>
      )}
    </div>
  )
}
