import Image from "next/image";

const materias = [
    "SUS",
    "Farmacologia",
    "Saúde Coletiva",
    "Ética Profissional",
    "Pediatria",
    "Obstetrícia",
    "Urgência",
    "Biossegurança",
    "Adulto e Idoso",
    "Legislação",
];

export default function Frustracao() {
    return (
        <section
            aria-labelledby="frustracao-heading"
            className="relative isolate overflow-hidden bg-gradient-to-b from-white via-sky-50/60 to-slate-50 pt-20 pb-24 sm:pt-28 sm:pb-32"
        >
            <div
                aria-hidden="true"
                className="absolute -top-32 -right-40 -z-10 h-[42rem] w-[42rem] rounded-full bg-gradient-to-br from-cyan-200/40 via-sky-200/30 to-transparent blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-32 -left-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-sky-100/70 to-transparent blur-3xl"
            />

            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid items-center gap-y-16 lg:grid-cols-12 lg:gap-x-16">
                    <div className="lg:col-span-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-cyan-700 shadow-sm ring-1 ring-cyan-100 backdrop-blur">
                            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-cyan-500" />
                            Para enfermeiros estudando para concurso
                        </span>

                        <h1
                            id="frustracao-heading"
                            className="mt-6 text-pretty text-4xl font-semibold tracking-tight text-sky-950 sm:text-5xl lg:text-6xl lg:leading-[1.05]"
                        >
                            O edital é enorme.
                            <span className="mt-1 block bg-gradient-to-r from-cyan-600 to-sky-700 bg-clip-text text-transparent">
                                Seu tempo não.
                            </span>
                        </h1>

                        <p className="mt-7 text-lg leading-8 text-slate-700">
                            Descubra quais conteúdos merecem sua atenção agora — e pare de desperdiçar energia
                            estudando sem direção.
                        </p>

                        <div className="mt-8 space-y-4 text-base leading-7 text-slate-600">
                            <p>
                                Você sente que quanto mais estuda, mais conteúdo aparece? O edital de enfermagem
                                parece infinito: SUS, ética profissional, saúde coletiva, farmacologia, urgência e
                                emergência, legislação, biossegurança… e, quando você tenta estudar para mais de um
                                concurso ao mesmo tempo, tudo fica ainda mais confuso.
                            </p>
                            <p>
                                No fim, a sensação é de estar sempre correndo atrás do conteúdo, mas sem saber se
                                está focando no que realmente pode te aproximar da aprovação.
                            </p>
                        </div>
                    </div>

                    <div className="relative lg:col-span-6">
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-4 top-6 bottom-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-cyan-100/70 via-white to-sky-50 ring-1 ring-cyan-100/60"
                        />
                        <div
                            aria-hidden="true"
                            className="absolute -inset-6 -z-20 rounded-[3rem] bg-gradient-to-br from-cyan-200/40 via-sky-100/30 to-transparent blur-2xl"
                        />

                        <Image
                            src="/enfermeira-estudando-concurso-publico-preocupada-livros.png"
                            alt="Enfermeira preocupada cercada de livros do edital de concurso"
                            width={1536}
                            height={1024}
                            priority
                            sizes="(min-width: 1024px) 50vw, 90vw"
                            className="relative mx-auto w-full max-w-xl drop-shadow-[0_25px_40px_rgba(8,145,178,0.18)]"
                        />

                        <ul
                            role="list"
                            className="mt-8 flex flex-wrap justify-center gap-2"
                        >
                            {materias.map((materia) => (
                                <li
                                    key={materia}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80"
                                >
                                    {materia}
                                </li>
                            ))}
                            <li className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                + muitos outros
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
