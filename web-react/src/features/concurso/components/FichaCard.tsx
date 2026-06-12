import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { CARD } from './card'
import { enter } from './motion'

export type FichaFact = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  /** null → a linha some; nunca renderizamos "não informado". */
  value: string | null
}

/**
 * Ficha lateral: um fato-herói no topo (o dado que mais pesa na decisão)
 * e os demais como linhas com ícone + label sobre valor — valores longos
 * quebram alinhados à esquerda em vez de flutuar à direita.
 * Linhas com `value` null somem; sem `editalUrl`, o botão some.
 */
export function FichaCard(props: {
  title: string
  hero: FichaFact
  rows: FichaFact[]
  editalUrl: string | null
  enterIdx: number
}) {
  const e = enter(props.enterIdx)
  const rows = props.rows.filter((r) => r.value != null)
  return (
    <section style={e.style} className={`${e.className} ${CARD} p-5`}>
      <h2 className="text-sm font-bold text-slate-900">{props.title}</h2>

      {/* Fato principal */}
      {props.hero.value != null && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-slate-200/70">
            <props.hero.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{props.hero.label}</p>
            <p className="text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
              {props.hero.value}
            </p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <dl className="mt-4 flex flex-col gap-3.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200/60">
                <r.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                <dd className="mt-px text-sm font-semibold leading-snug text-slate-800">
                  {r.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {props.editalUrl != null && (
        <a
          href={props.editalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          <DocumentTextIcon className="h-4 w-4" />
          Ver edital oficial
        </a>
      )}
    </section>
  )
}
