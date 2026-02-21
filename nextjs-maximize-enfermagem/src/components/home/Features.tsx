'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {
    MagnifyingGlassIcon,
    ClipboardDocumentListIcon,
    ChartBarIcon,
    BookOpenIcon,
    ArrowPathIcon,
    SparklesIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckIcon,
} from '@heroicons/react/20/solid'

const trainingCycle = [
    {
        step: 1,
        name: 'Escolha da prova',
        description:
            'Aqui voce deverá escolher a prova que você quer treinar. O ideal é escolher uma prova recente da banca que você está estudando.',
        bullets: [
            'Filtre por banca, órgão e cargo',
            'Questões reais de provas anteriores',
            'Banco de questões em constante atualização',
        ],
        icon: MagnifyingGlassIcon,
        color: 'text-sky-600',
        image: '/Screenshot 2026-02-20 at 18.41.47.png',
    },
    {
        step: 2,
        name: 'Simulado',
        description:
            'Aqui voce vai fazer um simulado com as questões da prova que você escolheu. Alem das questões identicas da prova, voce terá acesso a dados adicionais, como:',
        bullets: [
            'Justificativa sobre cada alternativa',
            'Estatisticas da questão',
            'Veja o seu historico de acertos e erros desta questão',
            'Comentários de outros estudantes sobre a questão',
            'Muito mais...'
        ],
        icon: ClipboardDocumentListIcon,
        color: 'text-blue-600',
        image: '/Screenshot 2026-02-19 at 16.21.00.png',
    },
    {
        step: 3,
        name: 'Diagnóstico',
        description:
            'Ao concluir o simulado, voce receberá um diagnóstico detalhado em segundos sobre seu desempenho. Aqui voce poderá ver:',
        bullets: [
            'Se seu desempenho seria suficiente para ser aprovado',
            'Dados detalhados sobre suas acertos e erros',
            'Análise detalhada por matéria e assunto',
            'Recomendações de estudo com base nos seus erros',
        ],
        icon: ChartBarIcon,
        color: 'text-amber-600',
        image: '/Screenshot 2026-02-19 at 16.42.39.png',
    },
    {
        step: 4,
        name: 'Estudo dirigido',
        description:
            'Com base no diagnótico, nossa Interligencia Artificial irá construid um plano de estudo personalizado para você, que inclui:',
        bullets: [
            'Lista de assuntos segmentados por matéria sobre o que voce precisa estudar',
            'Explicações detalhadas sobre cada assunto',
            'Exercícios para fixar cada tema',
            'Referencia das questões erradas sobre este assunto',
        ],
        icon: BookOpenIcon,
        color: 'text-emerald-600',
        image: '/Screenshot 2026-02-19 at 16.46.17.png',
    },
    {
        step: 5,
        name: 'Re-tentativa',
        description:
            'Agora que voce seguiu o plano de estudo, voce pode fazer uma nova tentativa com as questões que voce errou. Esta etapa é essencial para consolidar o aprendizado e aumentar suas chances de aprovação.',
        bullets: [
            'Apenas as questões que voce errou na ultima tentativa otimizando seu tempo de estudo',
            'Prática de recuperação ativa da memória se cansar com assuntos ja dominados',
        ],
        icon: ArrowPathIcon,
        color: 'text-violet-600',
        image: '/Screenshot 2026-02-19 at 16.47.04.png',
    },
    {
        step: 6,
        name: 'Resultado final',
        description:
            'Aqui voce terá um comparativo entre o seu conhecimento antes e depois do estudo, deixando claro o quanto voce evoluiu',
        bullets: [
            'Nota inicial vs. nota após o estudo',
            'Evolução detalhada por matéria',
        ],
        icon: SparklesIcon,
        color: 'text-rose-600',
        image: '/Screenshot 2026-02-19 at 16.48.01.png',
    },
]

export default function Features() {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'center',
        skipSnaps: false,
    })

    const scrollPrev = useCallback(() => {
        emblaApi?.scrollPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        emblaApi?.scrollNext()
    }, [emblaApi])

    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
        emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()))
    }, [emblaApi])

    return (
        <section
            className="overflow-hidden bg-slate-200/80 py-20 sm:py-24"
            aria-labelledby="ciclo-treino-heading"
        >
            <div className="mx-auto max-w-6xl px-6 lg:px-8">
                <div className="w-full">
                    <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                        Como funciona o treino?
                    </p>
                    <h2
                        id="ciclo-treino-heading"
                        className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl"
                    >
                        6 etapas para transformar erro em aprovação
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        A plataforma é construída sobre um método comprovado pela ciência cognitiva chamado {''}
                        <strong className="text-gray-900">
                        <em>Retrieval Practice</em>
                        </strong>
                        {' '}(
                            <em>Prática de Recuperação</em>
                        ).
                    </p>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Em vez de estudar passivamente, indo de um simulado para outro, cada prova vira um feedback imediato, direcionando voce sobre quais assuntos voce precisa estudar, otimizando seu tempo evitando estudar assuntos que voce já domina.
                    </p>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Este direcionamento é feito através de um diagnóstico detalhado feito com IA com base no seu desempenho da ultima prova.
                    </p>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Todo este processo é chamado de <strong className="text-gray-900"><em>"Treino"</em></strong>. Veja com mais detalhes abaixo como ele funciona :
                    </p>
                </div>

                {/* Carousel */}
                <div className="mt-16">
                    <div className="relative">
                        <div
                            className="overflow-hidden rounded-2xl"
                            ref={emblaRef}
                        >
                            <div className="flex touch-pan-y">
                                {trainingCycle.map((stage) => (
                                    <div
                                        key={stage.name}
                                        className="min-w-0 flex-[0_0_100%] px-2 sm:px-4"
                                        role="group"
                                        aria-roledescription="slide"
                                        aria-label={`Etapa ${stage.step} de 6: ${stage.name}`}
                                    >
                                        <div className="flex flex-col gap-8 rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-gray-900/5 backdrop-blur sm:p-8 lg:flex-row lg:items-center lg:gap-12">
                                            {/* Texto — sempre à esquerda */}
                                            <div className="flex flex-col lg:w-1/2">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
                                                        <stage.icon
                                                            aria-hidden="true"
                                                            className={`size-6 ${stage.color}`}
                                                        />
                                                    </span>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-500">
                                                            Etapa {stage.step} de 6
                                                        </span>
                                                        <h3 className="text-xl font-semibold text-gray-900">
                                                            {stage.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <p className="mt-4 text-base leading-7 text-gray-600">
                                                    {stage.description}
                                                </p>
                                                <ul className="mt-4 space-y-2" role="list">
                                                    {stage.bullets.map((bullet) => (
                                                        <li
                                                            key={bullet}
                                                            className="flex items-start gap-2 text-sm text-gray-600"
                                                        >
                                                            <CheckIcon className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
                                                            <span>{bullet}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Imagem — sempre à direita */}
                                            <div className="shrink-0 lg:w-1/2">
                                                {stage.image ? (
                                                    <img
                                                        src={stage.image}
                                                        alt={`Tela da etapa ${stage.step}: ${stage.name}`}
                                                        className="w-full rounded-xl object-cover shadow-md ring-1 ring-gray-900/5"
                                                    />
                                                ) : (
                                                    <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                                                        Imagem em breve
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Botões de navegação */}
                        <button
                            type="button"
                            onClick={scrollPrev}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 rounded-full bg-white p-2 shadow-lg ring-1 ring-gray-900/10 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:-translate-x-4"
                            aria-label="Etapa anterior"
                        >
                            <ChevronLeftIcon className="size-6 text-gray-700" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={scrollNext}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 rounded-full bg-white p-2 shadow-lg ring-1 ring-gray-900/10 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:translate-x-4"
                            aria-label="Próxima etapa"
                        >
                            <ChevronRightIcon className="size-6 text-gray-700" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Indicadores (dots) */}
                    <div
                        className="mt-8 flex justify-center gap-2"
                        role="tablist"
                        aria-label="Navegação entre etapas do ciclo"
                    >
                        {trainingCycle.map((stage, index) => (
                            <button
                                key={stage.name}
                                type="button"
                                role="tab"
                                aria-selected={selectedIndex === index}
                                aria-label={`Ir para etapa ${stage.step}: ${stage.name}`}
                                onClick={() => emblaApi?.scrollTo(index)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${
                                    selectedIndex === index
                                        ? 'w-8 bg-blue-600'
                                        : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
