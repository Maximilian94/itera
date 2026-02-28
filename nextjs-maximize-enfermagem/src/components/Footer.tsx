import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-sky-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-3">
              Maximize Enfermagem
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Plataforma de questões exclusiva para concursos públicos de
              enfermagem. Estude com metodologia baseada em evidências
              científicas.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/concursos"
                  className="hover:text-white transition-colors"
                >
                  Concursos
                </Link>
              </li>
              <li>
                <Link
                  href="/politica-de-privacidade"
                  className="hover:text-white transition-colors"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/termos-de-uso"
                  className="hover:text-white transition-colors"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/exclusao-de-dados"
                  className="hover:text-white transition-colors"
                >
                  Exclusão de Dados
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Contato
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:contato@maximizeenfermagem.com.br"
                  className="hover:text-white transition-colors"
                >
                  contato@maximizeenfermagem.com.br
                </a>
              </li>
              <li>
                <Link
                  href="https://app.maximizeenfermagem.com.br"
                  className="hover:text-white transition-colors"
                >
                  Acessar Plataforma
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-sky-800 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Maximize Enfermagem. Todos os
          direitos reservados.
        </div>
      </div>
    </footer>
  );
}
