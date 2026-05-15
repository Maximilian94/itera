import Image from "next/image";

export default function Frustracao() {
    return (
        <section
            aria-labelledby="frustracao-heading"
            className="relative isolate overflow-hidden bg-slate-50 pt-20 pb-24 sm:pt-24 sm:pb-28"
        >
            <svg
                aria-hidden="true"
                className="absolute inset-0 -z-10 size-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
            >
                <defs>
                    <pattern
                        x="50%"
                        y={-1}
                        id="lp-plantao-grid"
                        width={200}
                        height={200}
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M.5 200V.5H200" fill="none" />
                    </pattern>
                </defs>
                <rect fill="url(#lp-plantao-grid)" width="100%" height="100%" strokeWidth={0} />
            </svg>

            <div className="mx-auto max-w-7xl px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:px-8">
                <div className="lg:col-span-7">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                        Para enfermeiros que estudam entre plantões
                    </p>
                    <h1
                        id="frustracao-heading"
                        className="mt-4 text-pretty text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl lg:text-6xl"
                    >
                        Seu plantão cansa.
                        <span className="block text-emerald-700">Mas a aprovação ainda exige constância.</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-700">
                        Descubra como está sua rotina de estudos hoje e o que precisa ser ajustado para você evoluir
                        mesmo com pouco tempo disponível.
                    </p>
                    <div className="mt-8 space-y-4 text-base leading-7 text-slate-600">
                        <p>
                            Você sai do plantão cansado demais para estudar — e culpado demais para descansar? Entre
                            escala 12x36, plantões noturnos, casa, família e imprevistos, estudar para concurso parece
                            sempre ficar para “quando der”. Só que o edital continua avançando, a prova se aproxima e
                            a sensação é de que você nunca consegue manter uma rotina de verdade.
                        </p>
                        <p>
                            No fim, você até tenta estudar, mas a falta de energia e consistência faz parecer que
                            está sempre recomeçando do zero.
                        </p>
                    </div>
                </div>

                <div className="relative mt-14 lg:col-span-5 lg:mt-0">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-emerald-50 to-sky-50"
                    />
                    <Image
                        src="/enfermeira-estudando.png"
                        alt="Enfermeira estudando concentrada em frente ao notebook"
                        width={520}
                        height={400}
                        priority
                        className="mx-auto w-full max-w-md drop-shadow-[0_30px_50px_rgba(8,145,178,0.15)]"
                    />
                </div>
            </div>
        </section>
    );
}
