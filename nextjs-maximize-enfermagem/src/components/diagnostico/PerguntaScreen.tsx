"use client";

import type { Pergunta } from "@/data/diagnostico/perguntas";
import type { Alternativa } from "@/lib/diagnostico/types";

interface PerguntaScreenProps {
  pergunta: Pergunta;
  selecionada?: Alternativa;
  onResponder: (alt: Alternativa) => void;
}

export function PerguntaScreen({
  pergunta,
  selecionada,
  onResponder,
}: PerguntaScreenProps) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
        Pergunta {pergunta.ordem} de 10
      </p>
      <h2 className="mt-3 text-balance text-2xl font-semibold leading-snug text-sky-900 sm:text-3xl">
        {pergunta.enunciado}
      </h2>

      <ul className="mt-8 space-y-3" role="radiogroup" aria-label={pergunta.enunciado}>
        {pergunta.alternativas.map((alt) => {
          const isSelected = selecionada === alt.key;
          return (
            <li key={alt.key}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onResponder(alt.key)}
                className={`group flex w-full items-start gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${
                  isSelected
                    ? "border-cyan-600 bg-cyan-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30"
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                    isSelected
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-cyan-100 group-hover:text-cyan-700"
                  }`}
                >
                  {alt.key}
                </span>
                <span className="text-base leading-relaxed text-slate-700">
                  {alt.texto}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
