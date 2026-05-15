import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon, CreditCardIcon, BoltIcon } from "@heroicons/react/20/solid";

const microbenefits = [
    { icon: ClockIcon, label: "10 perguntas · ~3 minutos" },
    { icon: CreditCardIcon, label: "Sem cartão de crédito" },
    { icon: BoltIcon, label: "Resultado imediato" },
];

export default function Gancho() {
    return (
        <section
            aria-labelledby="gancho-heading"
            className="relative isolate overflow-hidden bg-white py-24 sm:py-32"
        >
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-32 -z-10 transform-gpu overflow-hidden blur-3xl"
            >
                <div
                    className="relative left-1/2 aspect-[1155/678] w-[40rem] -translate-x-1/2 bg-gradient-to-tr from-cyan-300 to-sky-400 opacity-20 sm:w-[72rem]"
                    style={{
                        clipPath:
                            "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                    }}
                />
            </div>

            <div className="mx-auto max-w-7xl px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-8">
                <div className="lg:col-span-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200">
                        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-cyan-500" />
                        Diagnóstico gratuito · 5 minutos
                    </p>
                    <h2
                        id="gancho-heading"
                        className="mt-5 text-pretty text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl lg:text-6xl"
                    >
                        Você sabe exatamente o que priorizar nos seus estudos para concurso de enfermagem?
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        Responda ao diagnóstico e descubra se sua preparação está focada nos temas certos ou se você
                        está tentando vencer o edital inteiro no escuro.
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                            href="/diagnostico"
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                        >
                            Quero descobrir o que priorizar
                            <ArrowRightIcon aria-hidden="true" className="size-5" />
                        </Link>
                    </div>

                    <ul role="list" className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                        {microbenefits.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-2 text-sm text-slate-500">
                                <Icon aria-hidden="true" className="size-4 text-cyan-500" />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative mt-16 lg:col-span-6 lg:mt-0">
                    <div
                        aria-hidden="true"
                        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-cyan-200/40 to-sky-300/30 blur-2xl"
                    />
                    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/10">
                        <Image
                            src="/Screenshot 2026-02-19 at 16.42.39.png"
                            alt="Diagnóstico de prioridades mostrando desempenho por matéria e recomendações"
                            width={1200}
                            height={780}
                            className="h-auto w-full"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
