"use client";

import { CheckCircleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import type { DiagnosticoResultado } from "@/lib/diagnostico/types";

interface ResultadoScreenProps {
  resultado: DiagnosticoResultado;
  email: string;
}

export function ResultadoScreen({ resultado, email }: ResultadoScreenProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center text-center">
      <div className="anim-reveal-up relative flex size-16 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
        <CheckCircleIcon
          aria-hidden="true"
          className="size-10 text-emerald-600"
        />
      </div>

      <p
        className="anim-reveal-up mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700"
        style={{ animationDelay: "120ms" }}
      >
        Análise concluída
      </p>

      <h1
        className="anim-reveal-up mt-3 text-balance text-2xl font-semibold leading-tight text-sky-900 sm:text-3xl"
        style={{ animationDelay: "200ms" }}
      >
        Seu perfil é
      </h1>

      <p
        className="anim-reveal-up mt-3 bg-gradient-to-r from-cyan-700 to-sky-700 bg-clip-text text-balance text-4xl font-bold leading-tight text-transparent sm:text-5xl"
        style={{ animationDelay: "320ms" }}
      >
        {resultado.perfil.nome}
      </p>

      <div
        className="anim-reveal-up mt-10 w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:p-7"
        style={{ animationDelay: "480ms" }}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-50 ring-1 ring-cyan-100">
            <EnvelopeIcon
              aria-hidden="true"
              className="size-6 text-cyan-700"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-sky-900 sm:text-lg">
              Seu diagnóstico completo está no e-mail
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Enviamos para{" "}
              <span className="font-medium text-sky-900 break-all">
                {email}
              </span>{" "}
              uma análise detalhada do seu perfil — com seus pontos fortes,
              o que priorizar primeiro e as próximas dicas práticas baseadas
              no que você respondeu.
            </p>
          </div>
        </div>
      </div>

      <p
        className="anim-reveal-up mt-6 text-xs leading-relaxed text-slate-500"
        style={{ animationDelay: "640ms" }}
      >
        Não chegou em alguns minutos? Verifique a caixa de spam ou promoções.
      </p>
    </div>
  );
}
