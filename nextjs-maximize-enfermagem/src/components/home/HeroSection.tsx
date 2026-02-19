import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            A plataforma de questões feita{" "}
            <span className="text-blue-200">exclusivamente</span> para
            enfermeiros
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
            Estude para concursos públicos de enfermagem com questões filtradas
            para o seu nicho e metodologia baseada em evidências científicas.
            Chega de perder tempo com conteúdo genérico.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="https://app.maximizeenfermagem.com.br"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
            >
              Começar agora gratuitamente
            </Link>
            <Link
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Como funciona
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            Sem cartão de crédito. Acesso imediato a questões gratuitas.
          </p>
        </div>
      </div>
    </section>
  );
}
