import { CheckIcon } from '@heroicons/react/24/outline'
import type { WeekActivity } from '../home-logic'

/**
 * "Sua semana": constância em tom de coach adulto — dias com sessão marcados,
 * sem streak punitivo nem foguinho.
 */
export function WeekCard({ week }: { week: WeekActivity }) {
  const todayPending = week.days.some((d) => d.isToday && !d.done)
  return (
    <section
      aria-labelledby="week-title"
      className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
    >
      <h2 id="week-title" className="text-sm font-bold text-slate-900">
        Sua semana
      </h2>
      <ul className="mt-3.5 flex list-none justify-between gap-1.5 p-0">
        {week.days.map((d) => (
          <li
            key={d.label}
            className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-slate-500"
          >
            <span
              aria-hidden
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-cyan-700 ${
                d.done
                  ? 'border-cyan-200 bg-cyan-50'
                  : d.isToday
                    ? 'border-2 border-cyan-600 bg-white'
                    : 'border-slate-200 bg-slate-50 text-slate-300'
              }`}
            >
              {d.done ? (
                <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                '·'
              )}
            </span>
            <span>
              {d.label}
              {d.isToday && <span className="sr-only"> (hoje)</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-700">
        <strong className="text-slate-900">
          {week.sessionsThisWeek}{' '}
          {week.sessionsThisWeek === 1 ? 'sessão' : 'sessões'}
        </strong>{' '}
        nesta semana.
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {week.weeklyRhythm > 0
          ? `Seu ritmo no último mês foi de ${week.weeklyRhythm} por semana.${
              todayPending ? ' Uma sessão hoje mantém o padrão.' : ''
            }`
          : 'Cada sessão conta: comece hoje e construa o seu ritmo.'}
      </p>
    </section>
  )
}
