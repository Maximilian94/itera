import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { LineChart } from '@mui/x-charts/LineChart'
import colors from 'tailwindcss/colors'
import dayjs from 'dayjs'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { useTrainingsQuery } from '@/features/training/queries/training.queries'
import { PpTooltip } from '@/components/PpTooltip'
import {
  evolutionSummary,
  linearRegressionSlope,
  toScoreHistory,
} from '@/features/home/home-logic'

export const Route = createFileRoute('/_authenticated/evolucao')({
  component: EvolucaoPage,
})

/**
 * Evolução completa: os dois gráficos que moravam na home (nota das provas ao
 * longo do tempo + ganho por treino), com as frases interpretadas. A home
 * ficou com o resumo (sparkline) e linka para cá.
 */
function EvolucaoPage() {
  const { data: historyItems = [], isLoading: loadingHistory } =
    useExamBaseAttemptHistoryQuery()
  const { data: trainings = [], isLoading: loadingTrainings } =
    useTrainingsQuery()

  const scoreHistory = toScoreHistory(historyItems)
  const { monthDelta } = evolutionSummary(scoreHistory)
  const trendSlopePerExam =
    scoreHistory.length >= 2
      ? linearRegressionSlope(scoreHistory.map((p) => p.score))
      : null

  const trainingsWithScores = trainings
    .filter(
      (t) =>
        t.currentStage === 'FINAL' &&
        t.initialScorePercentage != null &&
        t.finalScorePercentage != null,
    )
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    )
  const trainingImprovementHistory = trainingsWithScores.map((t) => ({
    date: dayjs(t.updatedAt).toDate(),
    improvement:
      (t.finalScorePercentage ?? 0) - (t.initialScorePercentage ?? 0),
  }))
  const avgTrainingImprovement =
    trainingImprovementHistory.length > 0
      ? trainingImprovementHistory.reduce((s, t) => s + t.improvement, 0) /
        trainingImprovementHistory.length
      : null

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 no-underline hover:text-cyan-700"
        >
          <ArrowLeftIcon aria-hidden className="h-4 w-4" />
          Início
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Sua evolução
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cada prova concluída entra aqui. A tendência importa mais que um dia
          ruim.{' '}
          <Link
            to="/evolucao-como-funciona"
            className="inline-flex items-center gap-0.5 font-semibold text-cyan-700 no-underline hover:underline"
          >
            Como é calculado?
            <ArrowRightIcon aria-hidden className="h-3 w-3" />
          </Link>
        </p>
      </div>

      <section
        aria-labelledby="score-chart-title"
        className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
      >
        <h2 id="score-chart-title" className="text-sm font-bold text-slate-900">
          Nota das provas ao longo do tempo
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {loadingHistory ? (
            'Carregando…'
          ) : monthDelta != null ? (
            monthDelta > 0 ? (
              <>
                Sua nota média{' '}
                <span className="font-semibold text-emerald-700">
                  subiu {monthDelta.toFixed(1)} <PpTooltip />
                </span>{' '}
                em relação ao mês anterior
              </>
            ) : monthDelta < 0 ? (
              <>
                Sua nota média{' '}
                <span className="font-semibold text-rose-700">
                  caiu {Math.abs(monthDelta).toFixed(1)} <PpTooltip />
                </span>{' '}
                em relação ao mês anterior
              </>
            ) : (
              'Sua nota média se manteve estável em relação ao mês anterior'
            )
          ) : scoreHistory.length === 0 ? (
            'Faça provas para acompanhar sua evolução'
          ) : (
            'Faça provas em dois meses para ver a tendência'
          )}
          {!loadingHistory && trendSlopePerExam != null && (
            <>
              {' · '}
              {trendSlopePerExam > 0 ? (
                <>
                  a cada nova prova sua nota{' '}
                  <span className="font-semibold text-emerald-700">
                    sobe {trendSlopePerExam.toFixed(1)} <PpTooltip />
                  </span>
                </>
              ) : trendSlopePerExam < 0 ? (
                <>
                  a cada nova prova sua nota{' '}
                  <span className="font-semibold text-rose-700">
                    cai {Math.abs(trendSlopePerExam).toFixed(1)} <PpTooltip />
                  </span>
                </>
              ) : (
                'sua nota está estável entre as provas'
              )}
            </>
          )}
        </p>
        {scoreHistory.length > 0 ? (
          <div className="mt-4 h-[260px] w-full min-w-0">
            <LineChart
              dataset={scoreHistory}
              xAxis={[
                {
                  dataKey: 'date',
                  scaleType: 'time',
                  valueFormatter: (value: Date) =>
                    dayjs(value).format('DD/MM/YY'),
                },
              ]}
              yAxis={[{ valueFormatter: (value: number) => `${value}%` }]}
              series={[
                {
                  dataKey: 'score',
                  label: 'Nota (%)',
                  color: colors.cyan[600],
                  showMark: true,
                },
              ]}
              height={240}
              margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
              grid={{ vertical: true, horizontal: true }}
              hideLegend
            />
          </div>
        ) : (
          !loadingHistory && (
            <div className="mt-4 flex h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <p className="px-2 text-center text-sm text-slate-500">
                Nenhuma prova concluída ainda.
              </p>
            </div>
          )
        )}
      </section>

      <section
        aria-labelledby="training-chart-title"
        className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
      >
        <h2
          id="training-chart-title"
          className="text-sm font-bold text-slate-900"
        >
          Ganho por treino concluído
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {loadingTrainings ? (
            'Carregando…'
          ) : avgTrainingImprovement != null ? (
            avgTrainingImprovement > 0 ? (
              <>
                Em média, sua nota{' '}
                <span className="font-semibold text-emerald-700">
                  sobe {avgTrainingImprovement.toFixed(1)} <PpTooltip />
                </span>{' '}
                do início ao fim de cada treino
              </>
            ) : avgTrainingImprovement < 0 ? (
              <>
                Em média, sua nota{' '}
                <span className="font-semibold text-rose-700">
                  cai {Math.abs(avgTrainingImprovement).toFixed(1)}{' '}
                  <PpTooltip />
                </span>{' '}
                do início ao fim de cada treino
              </>
            ) : (
              'Sua nota se mantém estável do início ao fim dos treinos'
            )
          ) : (
            'Conclua treinos para ver sua evolução'
          )}
        </p>
        {trainingImprovementHistory.length > 0 ? (
          <div className="mt-4 h-[260px] w-full min-w-0">
            <LineChart
              dataset={trainingImprovementHistory}
              xAxis={[
                {
                  dataKey: 'date',
                  scaleType: 'time',
                  valueFormatter: (value: Date) =>
                    dayjs(value).format('DD/MM/YY'),
                },
              ]}
              yAxis={[
                {
                  valueFormatter: (value: number) =>
                    `${value >= 0 ? '+' : ''}${value} p.p.`,
                },
              ]}
              series={[
                {
                  dataKey: 'improvement',
                  label: 'Ganho (p.p.)',
                  color: colors.emerald[600],
                  showMark: true,
                },
              ]}
              height={240}
              margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
              grid={{ vertical: true, horizontal: true }}
              hideLegend
            />
          </div>
        ) : (
          !loadingTrainings && (
            <div className="mt-4 flex h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <p className="px-2 text-center text-sm text-slate-500">
                Nenhum treino concluído ainda.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  )
}
