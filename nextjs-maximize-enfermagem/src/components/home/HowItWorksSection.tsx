const STEPS = [
  {
    step: "01",
    title: "Crie sua conta gratuita",
    description:
      "Cadastre-se em segundos e tenha acesso imediato a questões gratuitas para começar a praticar.",
  },
  {
    step: "02",
    title: "Escolha seu concurso e estude",
    description:
      "Filtre as questões por banca, órgão e assunto. Monte simulados personalizados ou use o modo de estudo guiado.",
  },
  {
    step: "03",
    title: "Evolua com dados e repetição",
    description:
      "Acompanhe suas estatísticas e deixe o sistema de repetição espaçada otimizar suas revisões automaticamente.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
            Passo a passo
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Comece a estudar em 3 passos
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((item, index) => (
            <div key={item.step} className="relative text-center">
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px border-t-2 border-dashed border-cyan-200" />
              )}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600 text-white text-xl font-bold relative z-10">
                {item.step}
              </div>
              <h3 className="mt-5 text-xl font-bold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-3 text-gray-600 leading-relaxed max-w-xs mx-auto">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
