export function ProblemSolutionSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-rose-500">
              O problema
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Plataformas genéricas não funcionam para enfermeiros
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                "Questões misturadas de todas as áreas da saúde",
                "Filtros ruins que não isolam conteúdo de enfermagem",
                "Milhares de questões irrelevantes para o seu concurso",
                "Tempo desperdiçado buscando material relevante",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="h-6 w-6 text-rose-400 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-green-600">
              A solução
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              100% focado em enfermagem para concursos
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                "Banco de questões exclusivo para enfermagem",
                "Filtros por banca, órgão, especialidade e tema",
                "Conteúdo curado e atualizado por enfermeiros",
                "Metodologia científica que otimiza seu tempo de estudo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="h-6 w-6 text-green-500 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
