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
            'Comece pelo concurso que você quer passar. O sistema monta um treino sob medida com questões reais da banca.',
        bullets: [
            'Filtre por banca, órgão e cargo',
            'Questões reais de concursos anteriores',
            'Treino 100% direcionado ao seu objetivo',
        ],
        icon: MagnifyingGlassIcon,
        color: 'text-sky-600',
        image: '/Screenshot 2026-02-20 at 18.41.47.png',
    },
    {
        step: 2,
        name: 'Simulado',
        description:
            'Faça a prova no mesmo formato do concurso real. Você treina o conteúdo e também o ritmo e a pressão do dia.',
        bullets: [
            'Formato idêntico ao da banca',
            'Controle de tempo como na prova real',
            'Questões com o nível de dificuldade do concurso',
        ],
        icon: ClipboardDocumentListIcon,
        color: 'text-blue-600',
        image: '/Screenshot 2026-02-19 at 16.21.00.png',
    },
    {
        step: 3,
        name: 'Diagnóstico',
        description:
            'Saiba exatamente onde você está forte e onde precisa melhorar. A IA analisa seu desempenho por matéria e gera recomendações personalizadas.',
        bullets: [
            'Análise detalhada por matéria e assunto',
            'Feedback da IA sobre seus erros',
            'Plano de estudo personalizado e priorizado',
        ],
        icon: ChartBarIcon,
        color: 'text-amber-600',
        image: '/Screenshot 2026-02-19 at 16.42.39.png',
    },
    {
        step: 4,
        name: 'Estudo dirigido',
        description:
            'Estude apenas o que você errou. Cada recomendação vem com explicação do conteúdo e exercícios práticos para fixar.',
        bullets: [
            'Conteúdo explicado de forma objetiva',
            'Exercícios para fixar cada tema',
            'Marque o que já dominou e avance no seu ritmo',
        ],
        icon: BookOpenIcon,
        color: 'text-emerald-600',
        image: '/Screenshot 2026-02-19 at 16.46.17.png',
    },
    {
        step: 5,
        name: 'Re-tentativa',
        description:
            'Refaça apenas as questões que errou — sem ver sua resposta anterior. É aqui que o aprendizado se consolida de verdade.',
        bullets: [
            'Apenas as questões que você errou',
            'Alternativa anterior oculta',
            'Prática de recuperação ativa da memória',
        ],
        icon: ArrowPathIcon,
        color: 'text-violet-600',
        image: '/Screenshot 2026-02-19 at 16.47.04.png',
    },
    {
        step: 6,
        name: 'Resultado final',
        description:
            'Compare sua nota antes e depois do estudo. Veja a evolução concreta por matéria e celebre cada avanço.',
        bullets: [
            'Nota inicial vs. nota após o estudo',
            'Evolução detalhada por matéria',
            'Histórico completo dos seus treinos',
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
                        Ciclo de treino
                    </p>
                    <h2
                        id="ciclo-treino-heading"
                        className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl"
                    >
                        6 etapas para transformar erro em aprovação
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        A Maximize é construída sobre um princípio comprovado pela ciência cognitiva:{' '}
                        <strong className="text-gray-900">
                            você aprende mais quando tenta lembrar do que quando apenas revisa.
                        </strong>
                    </p>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Esse método se chama <em>Retrieval Practice</em> (Prática de Recuperação).
                        Em vez de estudar passivamente, você é constantemente desafiado a recuperar
                        a informação da memória — o que fortalece o aprendizado e reduz o esquecimento.
                    </p>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Mas metodologia sozinha não basta. O diferencial está em como ela é aplicada.
                        Cada treino segue um ciclo completo de 6 etapas:
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
