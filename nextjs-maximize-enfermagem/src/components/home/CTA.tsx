import Image from "next/image";
import { CheckCircleIcon } from "@heroicons/react/20/solid";

const benefits = [
    'Sem necessidade de cartão de crédito',
    'Diagnóstico completo do seu desempenho',
    'Plano de estudo personalizado com IA',
    'Acesso imediato — comece agora mesmo',
]

export default function CTA() {
    return (
        <div className="relative overflow-hidden bg-sky-950 py-24 sm:py-32">

            {/* Glow decoration */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-cyan-400 to-sky-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-288.75"
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                />
            </div>

            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">

                    {/* Left: Text */}
                    <div className="w-full lg:max-w-xl xl:max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                            Comece gratuitamente
                        </p>
                        <h2 className="mt-3 text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            O primeiro treino é por nossa conta.
                        </h2>
                        <p className="mt-6 text-lg leading-8 text-sky-200">
                            Assinar um compromisso é uma decisão que exige bastante reflexão e análise, e ao mesmo tempo entendemos sua urgência em definir sua estratégia para o concurso.
                        </p>
                        <p className="mt-4 text-lg leading-8 text-sky-200">
                            Por isso, decidimos oferecer o primeiro treino por nossa conta, para que voce possa testar a plataforma e ver se ela é para voce.
                        </p>

                        <ul className="mt-8 space-y-3">
                            {benefits.map((benefit) => (
                                <li key={benefit} className="flex items-center gap-3">
                                    <CheckCircleIcon
                                        className="size-5 shrink-0 text-cyan-400"
                                        aria-hidden="true"
                                    />
                                    <span className="text-sm text-sky-100">{benefit}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <a
                                href="https://app.maximizeenfermagem.com.br"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                            >
                                Fazer um treino grátis{' '}
                                <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>

                    {/* Right: Image */}
                    <div className="relative w-full lg:flex-1">
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 -z-10 rounded-3xl bg-linear-to-br from-cyan-500/20 to-sky-600/10 blur-3xl"
                        />
                        <Image
                            src="/cta-image.png"
                            alt="Preview da plataforma Maximize Enfermagem"
                            width={580}
                            height={520}
                            className="relative mx-auto w-full max-w-lg lg:max-w-none filter-[drop-shadow(0_0_30px_rgba(6,182,212,0.2))_drop-shadow(0_30px_60px_rgba(0,0,0,0.4))]"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
