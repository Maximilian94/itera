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
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
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
            'Muito mais...',
        ],
        icon: ClipboardDocumentListIcon,
        color: 'text-sky-500',
        bgColor: 'bg-sky-50',
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
        bgColor: 'bg-amber-50',
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
        bgColor: 'bg-emerald-50',
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
        bgColor: 'bg-violet-50',
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
        bgColor: 'bg-rose-50',
        image: '/Screenshot 2026-02-19 at 16.48.01.png',
    },
]

export default function Features() {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'start',
        skipSnaps: false,
    })

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (!emblaApi) return
        const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
        emblaApi.on('select', onSelect)
        onSelect()
        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi])

    return (
        <section
            className="overflow-hidden bg-slate-100 py-20 sm:py-24"
            aria-labelledby="ciclo-treino-heading"
        >
            <div className="mx-auto max-w-6xl px-6 lg:px-8">

                {/* Header */}
                <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
                        Como funciona o treino?
                    </p>
                    <h2
                        id="ciclo-treino-heading"
                        className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl"
                    >
                        6 etapas para transformar erro em aprovação
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        A plataforma é construída sobre um método comprovado pela ciência cognitiva chamado{' '}
                        <strong className="text-sky-900">
                            <em>Retrieval Practice</em>
                        </strong>
                        {' '}(<em>Prática de Recuperação</em>).
                    </p>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        Em vez de estudar passivamente, indo de um simulado para outro, cada prova vira um feedback imediato, direcionando voce sobre quais assuntos voce precisa estudar, otimizando seu tempo evitando estudar assuntos que voce já domina.
                    </p>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        Este direcionamento é feito através de um diagnóstico detalhado feito com IA com base no seu desempenho da ultima prova.
                    </p>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        Todo este processo nos chamamos de{' '}
                        <strong className="text-sky-900"><em>"Treino"</em></strong>.
                        Veja com mais detalhes abaixo como ele funciona:
                    </p>
                </div>

                {/* Step tabs — show step number only on mobile, full label on sm+ */}
                <div className="mt-10 flex flex-wrap gap-2">
                    {trainingCycle.map((stage, index) => (
                        <button
                            key={stage.name}
                            type="button"
                            onClick={() => emblaApi?.scrollTo(index)}
                            aria-pressed={selectedIndex === index}
                            aria-label={`Ir para etapa ${stage.step}: ${stage.name}`}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all duration-200 sm:px-3 ${
                                selectedIndex === index
                                    ? 'bg-cyan-600 text-white shadow-sm'
                                    : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none ${
                                    selectedIndex === index
                                        ? 'bg-white/25 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {stage.step}
                            </span>
                            <span className="hidden sm:inline">{stage.name}</span>
                        </button>
                    ))}
                </div>

                {/* Carousel */}
                <div className="mt-6">
                    <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
                        <div className="flex touch-pan-y select-none">
                            {trainingCycle.map((stage) => (
                                <div
                                    key={stage.name}
                                    className="min-w-0 flex-[0_0_100%]"
                                    role="group"
                                    aria-roledescription="slide"
                                    aria-label={`Etapa ${stage.step} de 6: ${stage.name}`}
                                >
                                    <div className="flex flex-col gap-8 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5 sm:p-8 lg:flex-row lg:items-start lg:gap-12">

                                        {/* Text — left */}
                                        <div className="flex flex-col lg:w-1/2">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${stage.bgColor} shadow-sm`}
                                                >
                                                    <stage.icon
                                                        aria-hidden="true"
                                                        className={`size-6 ${stage.color}`}
                                                    />
                                                </span>
                                                <div>
                                                    <span className="text-sm font-medium text-slate-400">
                                                        Etapa {stage.step} de 6
                                                    </span>
                                                    <h3 className="text-xl font-semibold text-sky-900">
                                                        {stage.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <p className="mt-4 text-base leading-7 text-slate-600">
                                                {stage.description}
                                            </p>
                                            <ul className="mt-4 space-y-2.5" role="list">
                                                {stage.bullets.map((bullet) => (
                                                    <li
                                                        key={bullet}
                                                        className="flex items-start gap-2 text-sm text-slate-600"
                                                    >
                                                        <CheckIcon
                                                            className="mt-0.5 size-4 shrink-0 text-cyan-600"
                                                            aria-hidden
                                                        />
                                                        <span>{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Image — right */}
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

                    {/* Bottom controls: prev · dots · next */}
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={scrollPrev}
                            className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                            aria-label="Etapa anterior"
                        >
                            <ChevronLeftIcon className="size-5 text-gray-700" aria-hidden="true" />
                        </button>

                        <div
                            className="flex items-center gap-1.5"
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
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        selectedIndex === index
                                            ? 'w-6 bg-cyan-600'
                                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={scrollNext}
                            className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                            aria-label="Próxima etapa"
                        >
                            <ChevronRightIcon className="size-5 text-gray-700" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
