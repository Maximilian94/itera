import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'

const comparisons = [
    {
        feature: '100% focado em enfermagem',
        description: 'Conteúdo exclusivo para concursos de enfermagem',
        us: true,
        them: false,
    },
    {
        feature: 'Ciclo de treino completo',
        description: 'Prova → Diagnóstico → Estudo → Re-tentativa → Resultado final',
        us: true,
        them: false,
    },
    {
        feature: 'Diagnóstico por assunto',
        description: 'Feedback detalhado sobre desempenho em cada matéria',
        us: true,
        them: false,
    },
    {
        feature: 'Estudo direcionado',
        description: 'Explicações + exercícios nas áreas que precisam de reforço',
        us: true,
        them: false,
    },
    {
        feature: 'Re-tentativa das questões erradas',
        description: 'Segunda chance para consolidar o aprendizado',
        us: true,
        them: false,
    },
    {
        feature: 'Acompanhamento de evolução',
        description: 'Nota inicial, antes e depois dos estudos',
        us: true,
        them: false,
    },
    {
        feature: 'Filtros avançados',
        description: 'Por banca, órgão, especialidade e assunto',
        us: true,
        them: 'partial',
    },
    {
        feature: 'Banco de questões',
        description: 'Questões de concursos anteriores',
        us: true,
        them: true,
    },
    {
        feature: 'Comentários e explicações',
        description: 'Resolução comentada das questões',
        us: true,
        them: true,
    },
]

function ComparisonCell({ value }: { value: boolean | 'partial' }) {
    if (value === true) {
        return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-100">
                <CheckIcon className="size-4 text-emerald-600" aria-hidden="true" />
            </span>
        )
    }
    if (value === 'partial') {
        return (
            <span className="text-xs font-medium text-amber-600">Parcial</span>
        )
    }
    return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-gray-100">
            <XMarkIcon className="size-4 text-gray-400" aria-hidden="true" />
        </span>
    )
}

export function CompetitorsComparisonSection() {
    return (
        <section className="overflow-hidden bg-gray-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
                    <p className="text-base font-semibold text-indigo-600">
                        Compare
                    </p>
                    <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                        Por que escolher nossa plataforma?
                    </h2>
                    <p className="mx-auto mt-6 max-w-2xl text-lg/8 text-gray-600">
                        Veja a diferença entre nossa metodologia estruturada e as plataformas
                        genéricas de questões.
                    </p>
                </div>

                <div className="mx-auto mt-16 max-w-4xl">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-gray-200 bg-gray-50/80 px-4 py-4 font-semibold text-gray-900 sm:px-6">
                            <div>Recurso</div>
                            <div className="w-12 text-center sm:w-24">Nossa plataforma</div>
                            <div className="w-12 text-center sm:w-24">Outras plataformas</div>
                        </div>

                        {/* Rows */}
                        {comparisons.map((row, index) => (
                            <div
                                key={row.feature}
                                className={`grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-4 sm:px-6 ${
                                    index % 2 === 1 ? 'bg-gray-50/50' : ''
                                }`}
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {row.feature}
                                    </p>
                                    <p className="mt-0.5 text-sm text-gray-500">
                                        {row.description}
                                    </p>
                                </div>
                                <div className="flex w-12 items-center justify-center sm:w-24">
                                    <ComparisonCell value={row.us} />
                                </div>
                                <div className="flex w-12 items-center justify-center sm:w-24">
                                    <ComparisonCell value={row.them} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        * Comparação com plataformas genéricas de questões para concursos
                    </p>
                </div>
            </div>
        </section>
    )
}
