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
            'Selecione uma prova ou concurso público para treinar. Foque no que importa para você e personalize seu estudo.',
        bullets: ['Escolha prova ou concurso específico', 'Treino direcionado ao seu objetivo', 'Personalize seu estudo'],
        icon: MagnifyingGlassIcon,
        color: 'text-sky-600',
        image: '/Screenshot 2026-02-20 at 18.41.47.png',
    },
    {
        step: 2,
        name: 'Prova',
        description:
            'Responda às questões no mesmo formato de uma prova real de concurso. Familiarize-se com o ritmo e a pressão do dia da prova.',
        bullets: ['Formato idêntico ao concurso real', 'Simula o ambiente de prova', 'Treino de tempo e concentração'],
        icon: ClipboardDocumentListIcon,
        color: 'text-blue-600',
        image: '/Screenshot 2026-02-19 at 16.21.00.png',
    },
    {
        step: 3,
        name: 'Diagnóstico',
        description:
            'Receba um feedback detalhado por assunto. Saiba exatamente onde você está forte e onde precisa investir mais tempo.',
        bullets: ['Análise por matéria e assunto', 'Identifica pontos fortes e fracos', 'Prioriza o que estudar'],
        icon: ChartBarIcon,
        color: 'text-amber-600',
        image: '/Screenshot 2026-02-19 at 16.42.39.png',
    },
    {
        step: 4,
        name: 'Estudo',
        description:
            'Para cada recomendação: explicação do conteúdo + exercícios práticos. Avance no seu ritmo e marque o que já dominou.',
        bullets: ['Explicação do conteúdo', 'Exercícios práticos', 'Avance no seu ritmo'],
        icon: BookOpenIcon,
        color: 'text-emerald-600',
        image: '/Screenshot 2026-02-19 at 16.46.17.png',
    },
    {
        step: 5,
        name: 'Re-tentativa',
        description:
            'Segunda chance nas questões que errou — sem ver a alternativa anterior. Consolide o aprendizado na prática.',
        bullets: ['Segunda chance nas questões erradas', 'Sem ver a alternativa anterior', 'Consolida o aprendizado'],
        icon: ArrowPathIcon,
        color: 'text-violet-600',
        image: '/Screenshot 2026-02-19 at 16.47.04.png',
    },
    {
        step: 6,
        name: 'Resultado final',
        description:
            'Veja sua evolução: nota inicial, antes dos estudos e nota final. Celebre cada progresso conquistado.',
        bullets: ['Nota inicial', 'Nota antes dos estudos', 'Nota final e evolução'],
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
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
                    <h2
                        id="ciclo-treino-heading"
                        className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl"
                    >
                        Metodologia baseada em ciência da aprendizagem
                    </h2>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    A Maximize é construída sobre um princípio comprovado:
                    </p>

                    <strong>você aprende mais quando tenta lembrar do que quando apenas revisa.</strong>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    Esse método é chamado de Retrieval Practice (Prática de Recuperação) — uma estratégia amplamente estudada na psicologia cognitiva.
                    </p>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    Em vez de estudar passivamente, você é constantemente desafiado a recuperar a informação da memória.
                    </p>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    Esse esforço fortalece o aprendizado, reduz o esquecimento e aumenta sua segurança na hora da prova.
                    </p>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    Mas metodologia sozinha não basta. O diferencial está em como ela é aplicada.
                    </p>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                    ⬇️ Veja como funciona na prática:
                    </p>
                </div>

                {/* Carousel */}
                <div className="mx-auto mt-16 max-w-4xl">
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
                                            {/* Imagem — sempre à esquerda */}
                                            <div className="shrink-0 lg:w-1/2">
                                                {stage.image ? (
                                                    <img
                                                        src={stage.image}
                                                        alt={`Etapa ${stage.step}: ${stage.name} — ilustração do fluxo`}
                                                        className="w-full rounded-xl object-cover shadow-md ring-1 ring-gray-900/5"
                                                    />
                                                ) : (
                                                    <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                                                        Imagem em breve
                                                    </div>
                                                )}
                                            </div>

                                            {/* Descrição e bullet points — sempre à direita */}
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
