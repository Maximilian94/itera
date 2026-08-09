import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

/**
 * Herói do estado sem meta: convite para escolher o próximo concurso.
 * `lastResult` (opcional) fecha o ciclo do treino concluído com o ganho.
 */
export function NoGoalHero({
  lastResult,
}: {
  lastResult: { title: string; deltaPp: number } | null
}) {
  return (
    <section
      aria-labelledby="no-goal-title"
      className="rounded-2xl border border-slate-300 bg-white px-5 py-6 shadow-sm sm:px-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Sua próxima meta
      </p>
      <h2
        id="no-goal-title"
        className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
      >
        Escolha seu próximo concurso
      </h2>
      <p className="mt-1 max-w-[52ch] text-sm leading-6 text-slate-600">
        {lastResult ? (
          <>
            Você concluiu o treino de{' '}
            <strong className="text-slate-900">{lastResult.title}</strong>
            {lastResult.deltaPp > 0 && (
              <>
                {' '}
                com{' '}
                <strong className="text-emerald-700">
                  +{lastResult.deltaPp.toFixed(0)} p.p.
                </strong>{' '}
                de evolução
              </>
            )}
            . Escolha o próximo alvo e comece o diagnóstico.
          </>
        ) : (
          'Defina o concurso que você quer passar: a home vira o seu quadro de treino, com prontidão, contagem regressiva e o próximo passo de cada dia.'
        )}
      </p>
      <Link
        to="/concursos"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-colors hover:bg-cyan-700"
      >
        Explorar concursos
        <ArrowRightIcon aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  )
}
