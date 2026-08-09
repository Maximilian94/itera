import { Link } from '@tanstack/react-router'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'
import colors from 'tailwindcss/colors'
import type { EvolutionSummary } from '../home-logic'

/**
 * Evolução comprimida: sparkline + a frase interpretada. Os gráficos
 * completos vivem em /evolucao ("Ver evolução completa").
 */
export function EvolutionCard({
  summary,
  loading,
}: {
  summary: EvolutionSummary
  loading: boolean
}) {
  const { monthDelta, latestScore, spark } = summary
  return (
    <section
      aria-labelledby="evolution-title"
      className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="evolution-title" className="text-sm font-bold text-slate-900">
          Evolução
        </h2>
        <Link
          to="/evolucao"
          className="text-xs font-bold text-cyan-700 no-underline hover:underline"
        >
          Ver evolução completa
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {loading ? (
          'Carregando…'
        ) : monthDelta != null ? (
          monthDelta > 0 ? (
            <>
              Sua média{' '}
              <strong className="text-emerald-700">
                subiu {monthDelta.toFixed(1)} p.p.
              </strong>{' '}
              em relação ao mês passado.
            </>
          ) : monthDelta < 0 ? (
            <>
              Sua média{' '}
              <strong className="text-rose-700">
                caiu {Math.abs(monthDelta).toFixed(1)} p.p.
              </strong>{' '}
              em relação ao mês passado.
            </>
          ) : (
            'Sua média ficou estável em relação ao mês passado.'
          )
        ) : spark.length === 0 ? (
          'Conclua provas para acompanhar sua evolução.'
        ) : (
          'Faça provas em dois meses para comparar sua média.'
        )}
      </p>
      {spark.length >= 2 ? (
        <div className="relative mt-3">
          {latestScore != null && (
            <div className="absolute right-0 top-0 z-10 text-right">
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {latestScore.toFixed(0)}%
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                última prova
              </p>
            </div>
          )}
          <SparkLineChart
            data={spark}
            height={72}
            color={colors.cyan[600]}
            area
            showHighlight
            showTooltip
            yAxis={{ min: 0, max: 100 }}
          />
        </div>
      ) : (
        !loading && (
          <div className="mt-3 flex h-[72px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <p className="text-xs text-slate-500">Sem dados suficientes ainda</p>
          </div>
        )
      )}
    </section>
  )
}
