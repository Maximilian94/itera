"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { SECONDARY_SCORES } from "@/data/diagnostico/perfis";
import type { DiagnosticoResultado } from "@/lib/diagnostico/types";

interface ResultadoScreenProps {
  resultado: DiagnosticoResultado;
}

const CTA_URL = "https://app.maximizeenfermagem.com.br";

export function ResultadoScreen({ resultado }: ResultadoScreenProps) {
  const labelByCategoria = new Map(
    SECONDARY_SCORES.map((s) => [s.categoria, s.label]),
  );

  return (
    <div className="flex w-full max-w-3xl flex-col">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
        Seu Diagnóstico · {resultado.totalScore}/30
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight text-sky-900 sm:text-4xl">
        Você é um(a){" "}
        <span className="text-cyan-700">{resultado.perfil.nome}</span>
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        {resultado.perfil.mensagemPrincipal}
      </p>

      <section className="mt-10">
        <h3 className="text-lg font-semibold text-sky-900">
          Como você está em cada dimensão
        </h3>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {resultado.scores.map((score) => {
            const label = labelByCategoria.get(score.categoria) ?? score.categoria;
            return (
              <li
                key={score.categoria}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {label}
                  </span>
                  <span className="text-sm font-bold text-sky-900">
                    {score.percentage}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-[width] duration-500"
                    style={{ width: `${score.percentage}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Ponto forte
          </p>
          <p className="mt-2 text-lg font-semibold text-emerald-900">
            {labelByCategoria.get(resultado.pontoForte.categoria)}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {resultado.pontoForte.percentage}% da pontuação máxima nesta dimensão.
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Ponto de atenção
          </p>
          <p className="mt-2 text-lg font-semibold text-amber-900">
            {labelByCategoria.get(resultado.pontoAtencao.categoria)}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Aqui é onde você mais ganha priorizando.
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-sky-900 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
          Próximo passo
        </p>
        <p className="mt-2 text-base leading-relaxed text-sky-50">
          {resultado.proximoPasso}
        </p>

        <a
          href={CTA_URL}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-base font-semibold text-sky-900 shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Conhecer o método Maximize
          <ArrowRightIcon aria-hidden="true" className="size-5" />
        </a>
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        Uma cópia deste diagnóstico foi enviada para o seu e-mail.
      </p>
    </div>
  );
}
