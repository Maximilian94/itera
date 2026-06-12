import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export const Route = createFileRoute(
  '/_authenticated/concursos/$concursoSlug/$cargoSlug',
)({
  component: CargoPage,
})

/**
 * Página do Cargo (nível 2) — stub navegável criado junto com o nível 1
 * (MAX-22) para os cards de cargo terem destino; a implementação completa
 * (plano de estudos, matérias, concorrência) é o MAX-23.
 */
function CargoPage() {
  const { concursoSlug } = Route.useParams()
  return (
    <div className="flex flex-col gap-4 pb-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/exams"
              search={{ board: undefined }}
              className="font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
            >
              Concursos
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            <Link
              to="/concursos/$concursoSlug"
              params={{ concursoSlug }}
              className="font-medium text-slate-500 no-underline transition-colors hover:text-cyan-700"
            >
              Concurso
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="font-semibold text-slate-900">Cargo</span>
          </li>
        </ol>
      </nav>
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)]">
        <h1 className="text-lg font-bold text-slate-900">Página do cargo em construção</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Os detalhes do cargo (plano de estudos, matérias e concorrência) chegam em
          breve.
        </p>
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Voltar ao concurso
        </Link>
      </section>
    </div>
  )
}
