import { Fragment } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import type { SubjectDistribution as SubjectDistributionData } from '../domain/concurso.types'
import { CARD } from './card'
import { enter, METER_BAR } from './motion'

/** Faixas de acerto: verde/vermelho só como feedback de desempenho. */
export function accuracyChipClass(v: number) {
  if (v >= 70) return 'bg-emerald-50 text-emerald-700'
  if (v >= 60) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

const pct = (fraction: number) => Math.round(fraction * 100)

/**
 * Distribuição de matérias. A mesma anatomia serve dois papéis temporais:
 * prova passada → fato ("o que caiu"); prova futura → padrão histórico
 * ("o que a banca costuma cobrar"). Título/subtítulo carregam o
 * enquadramento; `predictive` só troca os verbos da leitura do treinador,
 * que vem do `insight` calculado pela API.
 */
export function SubjectDistribution(props: {
  title: string
  subtitle: string
  data: SubjectDistributionData
  predictive: boolean
  meters: boolean
  enterIdx: number
  onTrainSubject?: (subject: string) => void
}) {
  const { title, subtitle, data, predictive, meters, enterIdx, onTrainSubject } = props
  const { insight } = data
  const e = enter(enterIdx)
  return (
    <section style={e.style} className={`${e.className} ${CARD} p-5 sm:p-6`}>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-3 flex flex-col">
        {data.subjects.map((s, i) => {
          const share = pct(s.share)
          const acc = s.userAccuracy != null ? pct(s.userAccuracy) : null
          return (
            <button
              key={s.subject}
              type="button"
              aria-label={`Treinar ${s.subject}`}
              onClick={onTrainSubject ? () => onTrainSubject(s.subject) : undefined}
              className="group -mx-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                    {s.subject}
                  </span>
                  {acc != null && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${accuracyChipClass(acc)}`}
                    >
                      você: {acc}%
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm">
                  <span className="font-bold tabular-nums text-slate-800">{share}%</span>
                  <span className="text-slate-400">
                    {' '}· {s.count} {s.count === 1 ? 'questão' : 'questões'}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`${METER_BAR} bg-cyan-500`}
                    style={{
                      width: meters ? `${share}%` : '0%',
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
                <span className="inline-flex shrink-0 -translate-x-1 items-center gap-1 text-xs font-semibold text-cyan-700 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                  Treinar
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Leitura do treinador: o insight que os números apontam */}
      {(insight.topSubjects.length > 0 || insight.weakestRelevant != null) && (
        <p className="mt-3 border-t border-slate-100 pt-3.5 text-sm leading-6 text-slate-600">
          {insight.topSubjects.length > 0 && (
            <>
              {insight.topSubjects.map((name, i) => (
                <Fragment key={name}>
                  {i > 0 && (i === insight.topSubjects.length - 1 ? ' e ' : ', ')}
                  <span className="font-semibold text-slate-800">{name}</span>
                </Fragment>
              ))}{' '}
              {insight.topSubjects.length > 1 ? 'somaram' : 'somou'}{' '}
              <span className="font-bold text-slate-900">{pct(insight.topShare)}%</span>{' '}
              {predictive ? 'das últimas provas' : 'da prova'}.
            </>
          )}
          {insight.weakestRelevant != null && (
            <>
              {' '}Seu ponto mais fraco hoje é{' '}
              <span className="font-semibold text-rose-700">
                {insight.weakestRelevant.subject} ({pct(insight.weakestRelevant.accuracy)}%)
              </span>
              , uma das matérias de maior peso: é por ela que vale começar.
            </>
          )}
        </p>
      )}
    </section>
  )
}
