const PILLARS = [
  {
    title: "Retrieval Practice",
    subtitle: "Prática de Recuperação",
    description:
      "Resolver questões é a forma mais eficaz de fixar conhecimento. Ao se esforçar para recuperar a informação da memória, você fortalece as conexões neurais e aprende de verdade.",
    icon: (
      <svg
        className="h-8 w-8 text-cyan-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        />
      </svg>
    ),
  },
  {
    title: "Repetição Espaçada",
    subtitle: "Spaced Repetition",
    description:
      "O sistema agenda revisões no momento ideal antes que você esqueça. Baseado na curva do esquecimento, você revisa menos e memoriza mais, otimizando seu tempo de estudo.",
    icon: (
      <svg
        className="h-8 w-8 text-cyan-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
  {
    title: "Feedback Imediato",
    subtitle: "Immediate Feedback",
    description:
      "Após cada questão, veja a resposta correta com explicação detalhada. Corrigir erros no momento certo evita que você memorize informações incorretas.",
    icon: (
      <svg
        className="h-8 w-8 text-cyan-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
];

export function EvidenceBasedSection() {
  return (
    <section className="py-20 sm:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
            Metodologia
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Aprendizado baseado em evidências científicas
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Nossa metodologia combina três pilares comprovados pela ciência
            cognitiva para maximizar sua retenção e desempenho em provas.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-50">
                {pillar.icon}
              </div>
              <h3 className="mt-5 text-xl font-bold text-gray-900">
                {pillar.title}
              </h3>
              <p className="text-sm text-cyan-600 font-medium">
                {pillar.subtitle}
              </p>
              <p className="mt-3 text-gray-600 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
