import { CheckCircleIcon } from "@heroicons/react/20/solid";

const beneficios = [
    "Se sua rotina de estudos é realista para quem trabalha em plantão.",
    "Quais momentos do dia ou da semana podem ser melhor aproveitados.",
    "Onde você está perdendo constância por excesso de cobrança.",
    "Se seu plano atual respeita sua energia, tempo e ritmo.",
    "Qual próximo ajuste pode tornar seus estudos mais sustentáveis.",
];

export default function PropostaValor() {
    return (
        <section
            aria-labelledby="proposta-heading"
            className="bg-slate-100 py-24 sm:py-32"
        >
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
                        O que o diagnóstico mede
                    </p>
                    <h2
                        id="proposta-heading"
                        className="mt-3 text-pretty text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl"
                    >
                        Cinco respostas para construir uma rotina que dura
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        Com base nas suas respostas, o diagnóstico ajuda você a identificar:
                    </p>
                </div>

                <ul role="list" className="mx-auto mt-12 max-w-3xl space-y-4">
                    {beneficios.map((beneficio) => (
                        <li
                            key={beneficio}
                            className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 transition-shadow hover:shadow-md"
                        >
                            <CheckCircleIcon
                                aria-hidden="true"
                                className="mt-0.5 size-6 shrink-0 text-cyan-600"
                            />
                            <span className="text-base leading-7 text-slate-700">{beneficio}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
