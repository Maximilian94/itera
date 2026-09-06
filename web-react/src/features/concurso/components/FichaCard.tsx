import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { CARD } from './card'
import { enter } from './motion'

export type FichaFact = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  /** null → a linha some; nunca renderizamos "não informado". */
  value: string | null
}

/** Link externo do rodapé da ficha (edital, página da organizadora...).
 *  `href` null → o link some; quem monta a lista não precisa filtrar. */
export type FichaLink = {
  href: string | null
  label: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

/**
 * Ficha lateral: um fato-herói no topo (o dado que mais pesa na decisão)
 * e os demais como linhas com ícone + label sobre valor — valores longos
 * quebram alinhados à esquerda em vez de flutuar à direita.
 * Linhas com `value` null somem; o mesmo vale para links sem `href`.
 *
 * O 1º link é o botão do card; os seguintes descem de peso (só texto),
 * para o rodapé não virar uma pilha de botões concorrentes.
 */
export function FichaCard(props: {
  title: string
  hero: FichaFact
  rows: Array<FichaFact>
  links: Array<FichaLink>
  enterIdx: number
  /** Nome da transição compartilhada (ex.: 'ficha-card') para morfar a ficha
   *  do concurso na ficha do cargo. */
  viewTransitionName?: string
}) {
  const e = enter(props.enterIdx)
  const rows = props.rows.filter((r) => r.value != null)
  // Dedupe por href: quando o edital É a página da organizadora, um link só.
  const links = props.links.filter(
    (l, i, all) =>
      l.href != null && all.findIndex((o) => o.href === l.href) === i,
  )
  return (
    <section
      style={{ ...e.style, viewTransitionName: props.viewTransitionName }}
      className={`${e.className} ${CARD} p-5`}
    >
      <h2 className="text-sm font-bold text-slate-900">{props.title}</h2>

      {/* Fato principal */}
      {props.hero.value != null && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-200/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-slate-200/70">
            <props.hero.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {props.hero.label}
            </p>
            <p className="text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
              {props.hero.value}
            </p>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <dl className="mt-4 flex flex-col gap-3.5">
          {/* Grupos dl>div só podem conter dt/dd (WCAG/axe definition-list);
              o ícone vive dentro do dt, posicionado na coluna do padding. */}
          {rows.map((r) => (
            <div key={r.label} className="relative pl-11">
              <dt className="text-xs font-medium text-slate-500">
                <span
                  aria-hidden
                  className="absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200/60"
                >
                  <r.icon className="h-4 w-4" />
                </span>
                {r.label}
              </dt>
              <dd className="mt-px text-sm font-semibold leading-snug text-slate-800">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {links.length > 0 && (
        <div className="mt-5 flex flex-col gap-1.5">
          {links.map((link, i) => {
            const Icon =
              link.icon ??
              (i === 0 ? DocumentTextIcon : ArrowTopRightOnSquareIcon)
            return (
              <a
                key={link.href}
                href={link.href!}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  i === 0
                    ? 'flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2'
                    : 'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-600 no-underline transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2'
                }
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
