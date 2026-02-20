import { ChevronRightIcon } from '@heroicons/react/20/solid'

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
                    className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
                />
            </div>
            <div className="mx-auto max-w-7xl p-20 lg:flex lg:px-8">
                <div className="mx-auto max-w-2xl shrink-0 lg:mx-0">
                    {/* <img
                        alt="Your Company"
                        src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=blue&shade=600"
                        className="h-11"
                    /> */}
                    {/* <div className="mt-24 sm:mt-32 lg:mt-16">
                        <a href="#" className="inline-flex space-x-6">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm/6 font-semibold text-blue-600 ring-1 ring-inset ring-blue-600/20">
                             What's new
                            </span>
                            <span className="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-600">
                                <span>Just shipped v1.0</span>
                                <ChevronRightIcon aria-hidden="true" className="size-5 text-gray-400" />
                            </span>
                        </a>
                    </div> */}
                    <h1 className="text-pretty text-5xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                        O jeito estratégico de estudar para concurso de enfermagem.
                    </h1>
                    <p className="mt-8 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
                        Estude com um sistema que analisa sua performance, identifica seus pontos fracos e cria um plano de treino personalizado para fortalecer exatamente o que você precisa melhorar.
                    </p>
                    <div className="mt-10 flex items-center gap-x-6">
                        <a
                            href="#"
                            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Fazer um treino grátis
                        </a>
                    </div>
                </div>

                <div>
                    <div className="h-full w-full bg-red-800 rounded-lg overflow-hidden">
                    <img
                            alt="App screenshot"
                            src="/Screenshot 2026-02-19 at 16.05.55.png"

                            className="h-full w-full object-cover object-left bg-gray-50 shadow-xl ring-1 ring-gray-900/10 ov"
                        />
                    </div>

                </div>
                {/* <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
                    <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                        <img
                            alt="App screenshot"
                            src="/Screenshot 2026-02-19 at 16.05.55.png"
                            width={2432}
                            height={1442}
                            className="w-[76rem] rounded-md bg-gray-50 shadow-xl ring-1 ring-gray-900/10"
                        />
                    </div>
                </div> */}
            </div>
        </div>
    )
}
