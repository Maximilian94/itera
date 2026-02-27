import Link from "next/link";

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    description: "Ideal para conhecer a plataforma",
    features: [
      "Acesso limitado a questões",
      "Filtros básicos",
      "Estatísticas resumidas",
    ],
    cta: "Criar conta grátis",
    href: "https://app.maximizeenfermagem.com.br",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "R$ 29,90",
    period: "/mês",
    description: "Para quem leva a aprovação a sério",
    features: [
      "Acesso ilimitado a questões",
      "Filtros avançados por banca e órgão",
      "Repetição espaçada inteligente",
      "Estatísticas completas",
      "Simulados personalizados",
    ],
    cta: "Assinar Premium",
    href: "/planos",
    highlighted: true,
  },
];

export function PlansCtaSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
            Planos
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Comece grátis, evolua quando quiser
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Sem compromisso. Cancele quando quiser.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-cyan-600 text-white ring-4 ring-cyan-600 ring-offset-2"
                  : "bg-white border border-gray-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold ${plan.highlighted ? "text-cyan-100" : "text-gray-600"}`}
              >
                {plan.name}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span
                  className={`text-sm ${plan.highlighted ? "text-cyan-200" : "text-gray-500"}`}
                >
                  {plan.period}
                </span>
              </div>
              <p
                className={`mt-2 text-sm ${plan.highlighted ? "text-cyan-100" : "text-gray-500"}`}
              >
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`h-5 w-5 shrink-0 ${plan.highlighted ? "text-cyan-200" : "text-cyan-600"}`}
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
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-white text-cyan-700 hover:bg-cyan-50"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
