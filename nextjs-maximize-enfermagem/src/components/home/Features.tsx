import {
    ClipboardDocumentListIcon,
    ChartBarIcon,
    BookOpenIcon,
    ArrowPathIcon,
    SparklesIcon,
} from '@heroicons/react/20/solid'

const trainingCycle = [
    {
        step: 1,
        name: 'Prova',
        description:
            'Responda às questões do simulado no mesmo formato que você já conhece — como uma prova real de concurso.',
        icon: ClipboardDocumentListIcon,
        color: 'text-blue-600',
        image: "/Screenshot 2026-02-19 at 16.21.00.png", // Ex: '/images/ciclo-prova.png'
    },
    {
        step: 2,
        name: 'Diagnóstico',
        description:
            'Receba um feedback detalhado sobre seu desempenho por assunto. Identifique seus pontos fortes e onde precisa melhorar.',
        icon: ChartBarIcon,
        color: 'text-amber-600',
        image: "/Screenshot 2026-02-19 at 16.42.39.png", // Ex: '/images/ciclo-diagnostico.png'
    },
    {
        step: 3,
        name: 'Estudo',
        description:
            'Para cada recomendação: explicação do conteúdo + exercícios práticos. Marque como concluído ou avance no seu ritmo.',
        icon: BookOpenIcon,
        color: 'text-emerald-600',
        image: '/Screenshot 2026-02-19 at 16.46.17.png', // Ex: '/images/ciclo-estudo.png'
    },
    {
        step: 4,
        name: 'Re-tentativa',
        description:
            'Segunda chance nas questões que errou — sem ver a alternativa marcada antes. Consolide o que aprendeu.',
        icon: ArrowPathIcon,
        color: 'text-violet-600',
        image: '/Screenshot 2026-02-19 at 16.47.04.png', // Ex: '/images/ciclo-retentativa.png'
    },
    {
        step: 5,
        name: 'Final',
        description:
            'Veja sua evolução: nota inicial, antes dos estudos e nota final. Celebre o progresso conquistado.',
        icon: SparklesIcon,
        color: 'text-rose-600',
        image: '/Screenshot 2026-02-19 at 16.48.01.png', // Ex: '/images/ciclo-final.png'
    },
]

export default function Features() {
    return (
        <div className="overflow-hidden bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
                    <h2 className="text-base/7 font-semibold text-indigo-600">
                        Ciclo de treino
                    </h2>
                    <p className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                        Aprenda com tentativas inteligentes
                    </p>
                    <p className="mx-auto mt-6 max-w-2xl text-lg/8 text-gray-600">
                        Nosso método combina prova, diagnóstico, estudo direcionado e re-tentativa
                        para você evoluir de forma eficiente. A perfeição vem de tentativas inteligentes.
                    </p>
                </div>

                <div className="mx-auto mt-16 max-w-4xl space-y-24 sm:mt-20">
                    {trainingCycle.map((stage, index) => {
                        const isImageRight = index % 2 === 1
                        return (
                            <div
                                key={stage.name}
                                className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12"
                            >
                                {/* Imagem — alterna esquerda/direita */}
                                <div
                                    className={`shrink-0 lg:w-1/2 ${
                                        isImageRight ? 'lg:order-2' : 'lg:order-1'
                                    }`}
                                >
                                    {stage.image ? (
                                        <img
                                            src={stage.image}
                                            alt={`Etapa ${stage.step}: ${stage.name}`}
                                            className="w-full rounded-xl object-cover shadow-lg ring-1 ring-gray-900/5"
                                        />
                                    ) : (
                                        <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                                            Adicione uma imagem em{' '}
                                            <code className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs">
                                                image: &apos;/images/...&apos;
                                            </code>
                                        </div>
                                    )}
                                </div>

                                {/* Conteúdo */}
                                <div
                                    className={`lg:w-1/2 ${
                                        isImageRight ? 'lg:order-1' : 'lg:order-2'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
                                                <stage.icon
                                                    aria-hidden="true"
                                                    className={`size-6 ${stage.color}`}
                                                />
                                            </span>
                                            <div>
                                                <span className="text-sm font-medium text-gray-500">
                                                    Etapa {stage.step}
                                                </span>
                                                <h3 className="font-semibold text-gray-900">
                                                    {stage.name}
                                                </h3>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-base/7 text-gray-600">
                                            {stage.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
