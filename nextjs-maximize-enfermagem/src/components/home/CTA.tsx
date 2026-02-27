import Image from "next/image";

export default function CTA() {
  return (
    <div className="overflow-hidden bg-slate-100 py-24 pt-0">
      <div className="mx-auto max-w-7xl px-6 lg:flex lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-16 lg:mx-0 lg:min-w-full lg:max-w-none lg:flex-none lg:gap-y-8">
          <div className="lg:col-end-1 lg:w-full lg:max-w-lg lg:pb-8">
            <h2 className="text-4xl font-semibold tracking-tight text-sky-900 sm:text-5xl">O primeiro treino é por nossa conta.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Assinar um compromisso é uma decisao que exige bastante reflexao e analise, e ao mesmo tempo entendemos sua urgencia em definir sua estratégia para seu concurso.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Sabendo disto, decidimos oferecer o primeiro treino por nossa conta, para que voce possa testar a plataforma e ver se ela é para voce.
            </p>
            {/* <p className="mt-6 text-base/7 text-gray-600">
                Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo. Elit sunt amet
                fugiat veniam occaecat fugiat. Quasi aperiam sit non sit neque reprehenderit.
              </p> */}
            <div className="mt-10 flex">
              <a
                href="#"
                className="rounded-md bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              >
                Fazer um treino grátis {''}
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-6 sm:gap-8 lg:contents">
            <div className="w-0 flex-auto lg:ml-auto lg:w-auto lg:flex-none lg:self-end">
              {/* <img
                  alt=""
                  src="/cta-image.png"
                //   src="/Screenshot 2026-02-19 at 16.54.06.png"
                  className="aspect-[7/5] w-[37rem] max-w-none rounded-2xl bg-gray-50 object-cover max-sm:w-[30rem]"
                /> */}

              <Image
                src="/cta-image.png"
                alt=""
                width={520}
                height={520}
                className="
  drop-shadow-[0_0_12px_rgba(8,145,178,0.18)]
  drop-shadow-[0_22px_55px_rgba(0,0,0,0.16)]
"
              />
            </div>
            {/* <div className="contents lg:col-span-2 lg:col-end-2 lg:ml-auto lg:flex lg:w-[37rem] lg:items-start lg:justify-end lg:gap-x-8">
                <div className="order-first flex w-64 flex-none justify-end self-end max-sm:w-40 lg:w-auto">
                  <img
                    alt=""
                    src="/Screenshot 2026-02-19 at 16.55.46.png"
                    className="aspect-[4/3] w-[24rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover"
                  />
                </div>
                <div className="flex w-96 flex-auto justify-end lg:w-auto lg:flex-none">
                  <img
                    alt=""
                    src="/Screenshot 2026-02-19 at 16.54.06.png"
                    // src="/Screenshot 2026-02-19 at 16.55.46.png"
                    className="aspect-[7/5] w-[37rem] max-w-none flex-none rounded-2xl bg-gray-50 object-cover max-sm:w-[30rem]"
                  />
                </div>
                <div className="hidden sm:block sm:w-0 sm:flex-auto lg:w-auto lg:flex-none">
                  <img
                    alt=""
                    src="/Screenshot 2026-02-19 at 16.56.58.png"
                    className="aspect-[4/3] w-[24rem] max-w-none rounded-2xl bg-gray-50 object-cover"
                  />
                </div>
              </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
