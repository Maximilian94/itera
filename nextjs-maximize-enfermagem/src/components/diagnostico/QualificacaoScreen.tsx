"use client";

import type {
  PerguntaQualificacao,
  QualificacaoValue,
} from "@/data/diagnostico/qualificacao";

interface QualificacaoScreenProps {
  pergunta: PerguntaQualificacao;
  ordemTotal: number;
  selecionada?: QualificacaoValue;
  onResponder: (value: QualificacaoValue) => void;
}

export function QualificacaoScreen({
  pergunta,
  ordemTotal,
  selecionada,
  onResponder,
}: QualificacaoScreenProps) {
  return (
    <div className="flex w-full max-w-2xl flex-col">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
        Pra entendermos seu contexto · {pergunta.ordem} de {ordemTotal}
      </p>
      <h2 className="mt-3 text-balance text-2xl font-semibold leading-snug text-sky-900 sm:text-3xl">
        {pergunta.enunciado}
      </h2>

      <ul className="mt-8 space-y-3" role="radiogroup" aria-label={pergunta.enunciado}>
        {pergunta.opcoes.map((opcao) => {
          const isSelected = selecionada === opcao.value;
          return (
            <li key={opcao.value}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onResponder(opcao.value)}
                className={`group flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${
                  isSelected
                    ? "border-cyan-600 bg-cyan-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? "border-cyan-600 bg-cyan-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="text-base leading-relaxed text-slate-700">
                  {opcao.texto}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
