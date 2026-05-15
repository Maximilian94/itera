import {
    AcademicCapIcon,
    CpuChipIcon,
    ShieldCheckIcon,
} from "@heroicons/react/20/solid";

const stats = [
    { label: "Questões reais de provas anteriores", value: "+10 mil" },
    { label: "Bancas e órgãos cobertos", value: "+50" },
    { label: "Diagnósticos já gerados", value: "+5 mil" },
];

const pilares = [
    {
        name: "Banco real, não inventado",
        description:
            "Todas as questões vêm de provas anteriores reais — não de cursinho, não de 'achei que cairia'. Seu diagnóstico é construído contra o que a banca já cobrou.",
        icon: ShieldCheckIcon,
    },
    {
        name: "IA que mapeia banca por banca",
        description:
            "Nossa IA cruza seu desempenho com o histórico de cada banca, cargo e edital. O que ela prioriza para você não é o mesmo que prioriza para outra pessoa.",
        icon: CpuChipIcon,
    },
    {
        name: "Construído por enfermeiros aprovados",
        description:
            "Cada análise passa por revisão de enfermeiras aprovadas em prefeituras, hospitais federais e secretarias estaduais. Quem te orienta já passou onde você quer chegar.",
        icon: AcademicCapIcon,
    },
];

export default function Credibilidade() {
    return (
        <section
            aria-labelledby="credibilidade-heading"
            className="relative isolate overflow-hidden bg-sky-950 py-24 sm:py-32"
        >
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-cyan-400 to-sky-600 opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72rem]"
                    style={{
                        clipPath:
                            "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                    }}
                />
            </div>

            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                        Por que você pode confiar
                    </p>
                    <h2
                        id="credibilidade-heading"
                        className="mt-3 text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl"
                    >
                        Não somos um cursinho genérico. Somos especialistas em prova de enfermagem.
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-sky-200">
                        Cada resposta sua é avaliada contra o histórico real da banca, do cargo e do concurso — não
                        contra um cronograma de prateleira.
                    </p>
                </div>

                <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10 backdrop-blur-sm"
                        >
                            <dt className="text-sm leading-snug text-sky-200">{stat.label}</dt>
                            <dd className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                {stat.value}
                            </dd>
                        </div>
                    ))}
                </dl>

                <ul role="list" className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
                    {pilares.map((pilar) => (
                        <li
                            key={pilar.name}
                            className="flex flex-col rounded-2xl bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur-sm"
                        >
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30">
                                <pilar.icon aria-hidden="true" className="size-6 text-cyan-300" />
                            </span>
                            <h3 className="mt-6 text-lg font-semibold text-white">{pilar.name}</h3>
                            <p className="mt-3 text-base leading-7 text-sky-200">{pilar.description}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
