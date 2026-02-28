import Image from "next/image";

export default function Hero() {
    return (
        <div className="relative isolate overflow-hidden bg-slate-50">
            <svg
                aria-hidden="true"
                className="absolute inset-0 -z-10 size-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
            >
                <defs>
                    <pattern
                        x="50%"
                        y={-1}
                        id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
                        width={200}
                        height={200}
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M.5 200V.5H200" fill="none" />
                    </pattern>
                </defs>
                <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
                    <path
                        d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                        strokeWidth={0}
                    />
                </svg>
                <rect fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)" width="100%" height="100%" strokeWidth={0} />
            </svg>
            <div
                aria-hidden="true"
                className="absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
                    }}
                    className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-cyan-400 to-sky-800 opacity-20"
                />
            </div>

            {/*
              Layout strategy:
              - Mobile (block): JSX source order = h1 → image → body+CTA  ✓
              - Desktop (lg grid): h1 col-1/row-1, image col-2/rows-1-2, body col-1/row-2
            */}
            <div className="mx-auto max-w-7xl px-6 pt-20 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:px-8 lg:pt-24">

                {/* 1. Title — left col, row 1 on desktop */}
                <h1 className="text-pretty text-5xl font-semibold tracking-tight text-sky-900 sm:text-5xl lg:col-start-1 lg:row-start-1">
                    Passe no concurso de enfermagem dos seus sonhos.
                </h1>

                {/* 2. Image — on mobile: between title and body; on desktop: right col spanning both rows */}
                <div className="relative mt-8 w-full lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0">
                    {/* Trending (fundo) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Image
                            src="/trending.png"
                            alt=""
                            fill
                            className="object-contain opacity-25 blur-[0.2px] scale-110"
                            priority
                        />
                    </div>

                    {/* Enfermeira (principal) */}
                    <div className="relative z-20 flex justify-center items-end pointer-events-none">
                        <Image
                            src="/nursing-3.png"
                            alt="Enfermeira"
                            width={520}
                            height={520}
                            className="drop-shadow-[0_30px_60px_rgba(8,145,178,0.18)] max-h-full w-auto"
                            priority
                        />
                    </div>

                    {/* Checklist (esquerda) */}
                    <div className="absolute left-4 top-[10%] z-30 hidden sm:block float1 pointer-events-none">
                        <Image src="/checklist.png" alt="" width={190} height={190} />
                    </div>

                    {/* Diagnóstico (direita) */}
                    <div className="absolute right-4 bottom-[10%] z-30 hidden sm:block float2 pointer-events-none">
                        <Image src="/diagnostico.png" alt="" width={360} height={220} />
                    </div>

                    {/* Badge (topo direita) */}
                    <div className="absolute right-6 top-[2%] z-30 hidden md:block float3 pointer-events-none">
                        <Image src="/badge.png" alt="" width={190} height={170} />
                    </div>

                    {/* Glow sutil */}
                    <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-cyan-600/20 blur-3xl z-10 pointer-events-none" />
                </div>

                {/* 3. Body + CTA — left col, row 2 on desktop; after image on mobile */}
                <div className="mt-8 pb-20 lg:col-start-1 lg:row-start-2 lg:mt-6 lg:pb-0">
                    <p className="text-pretty text-lg font-medium text-slate-600 sm:text-xl/8">
                        Receba um diagnóstico preciso, estude com material personalizado pela nossa IA e veja sua nota aumentar a cada treino.
                    </p>
                    <div className="mt-10 flex items-center gap-x-6">
                        <a
                            href="https://app.maximizeenfermagem.com.br"
                            className="rounded-md bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                        >
                            Iniciar meu treino inteligente (grátis)
                        </a>
                    </div>
                </div>

            </div>
        </div>
    )
}
