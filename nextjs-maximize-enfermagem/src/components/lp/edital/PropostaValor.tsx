import { CheckCircleIcon } from "@heroicons/react/20/solid";

const beneficios = [
    "Quais áreas estão consumindo seu tempo sem gerar evolução.",
    "Quais temas precisam de mais atenção na sua preparação.",
    "Se sua rotina de estudos está alinhada ao tipo de concurso que você quer prestar.",
    "Onde existe excesso de esforço e pouca estratégia.",
    "Qual deve ser seu próximo passo para estudar com mais clareza.",
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
                        Cinco descobertas que clareiam o seu próximo mês de estudo
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
