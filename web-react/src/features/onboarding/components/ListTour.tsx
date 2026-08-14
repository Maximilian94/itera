import { AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

/**
 * Walkthrough do Ato 1 na lista de concursos: a página começa em branco (intro)
 * e depois um coach-mark ancorado passa por cada componente — preferências →
 * filtros → lista — destacando a peça e explicando ao lado (ver Coachmark).
 *
 * Passos: 0 = intro, 1 = preferências, 2 = filtros, 3 = lista.
 */
export const LIST_TOUR_TOTAL = 4

export const LIST_TOUR_COPY: Partial<
  Record<number, { title: string; body: string }>
> = {
  1: {
    title: 'Suas preferências',
    body: 'Elas ordenam a lista: os concursos mais a ver com você aparecem primeiro. Toque em "Editar" pra ajustar quando quiser.',
  },
  2: {
    title: 'Busca e filtros',
    body: 'Busque por instituição ou cidade, e filtre por estado, banca e situação (abertas, a caminho, aplicadas).',
  },
  3: {
    title: 'Os concursos',
    body: 'Cada linha é um concurso, e os recomendados pra você vêm primeiro. Toque pra abrir, ver os cargos e definir sua meta.',
  },
}

/** Tela inicial em branco: só a mensagem e "Avançar". */
export function ListTourIntro({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <section
      aria-label="Escolher o concurso para treinar"
      className="m-auto w-full max-w-lg px-4 py-16 text-center sm:px-6"
    >
      <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
        <AcademicCapIcon className="h-7 w-7" />
      </span>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl">
        Agora é hora de escolher o concurso para treinar
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
        Vou te apresentar a página rapidinho — leva alguns segundos.
      </p>
      <div className="mt-8">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Avançar
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Pular o tour
      </button>
    </section>
  )
}
