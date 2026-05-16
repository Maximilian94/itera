"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckIcon } from "@heroicons/react/20/solid";
import type {
  PerguntaQualificacao,
  QualificacaoValue,
} from "@/data/diagnostico/qualificacao";

interface QualificacaoScreenProps {
  pergunta: PerguntaQualificacao;
  ordemTotal: number;
  selecionada?: QualificacaoValue;
  onResponder: (value: QualificacaoValue) => void;
  onVoltar?: () => void;
}

const ADVANCE_DELAY_MS = 320;

export function QualificacaoScreen({
  pergunta,
  ordemTotal,
  selecionada,
  onResponder,
  onVoltar,
}: QualificacaoScreenProps) {
  const [pending, setPending] = useState<QualificacaoValue | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleResponder(value: QualificacaoValue) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(value);
    timerRef.current = setTimeout(() => onResponder(value), ADVANCE_DELAY_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key < "1" || e.key > "9") return;
      const idx = Number(e.key) - 1;
      if (idx < 0 || idx >= pergunta.opcoes.length) return;
      e.preventDefault();
      handleResponder(pergunta.opcoes[idx].value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pergunta.opcoes]);

  function handleArrowKeys(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(
      groupRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      ) ?? [],
    );
    if (buttons.length === 0) return;
    const currentIdx = buttons.findIndex((b) => b === document.activeElement);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const nextIdx =
      currentIdx === -1
        ? dir === 1
          ? 0
          : buttons.length - 1
        : (currentIdx + dir + buttons.length) % buttons.length;
    buttons[nextIdx]?.focus();
  }

  const activeValue = pending ?? selecionada;

  return (
    <div className="anim-fade-up flex w-full max-w-2xl flex-col">
      {onVoltar ? (
        <button
          type="button"
          onClick={onVoltar}
          className="mb-3 -ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-slate-500 hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Voltar
        </button>
      ) : null}

      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
        Pra entendermos seu contexto · {pergunta.ordem} de {ordemTotal}
      </p>
      <h2 className="mt-3 text-balance text-2xl font-semibold leading-snug text-sky-900 sm:text-3xl">
        {pergunta.enunciado}
      </h2>

      <ul
        ref={groupRef}
        className="mt-8 space-y-3"
        role="radiogroup"
        aria-label={pergunta.enunciado}
        onKeyDown={handleArrowKeys}
      >
        {pergunta.opcoes.map((opcao) => {
          const isActive = activeValue === opcao.value;
          const isPending = pending === opcao.value;
          return (
            <li key={opcao.value}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleResponder(opcao.value)}
                className={`group flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                  isActive
                    ? "border-cyan-600 bg-cyan-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30"
                } ${isPending ? "scale-[1.015]" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? "border-cyan-600 bg-cyan-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isPending ? (
                    <CheckIcon className="size-3 text-white" />
                  ) : isActive ? (
                    <span className="size-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="flex-1 text-base leading-relaxed text-slate-700">
                  {opcao.texto}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 hidden text-xs text-slate-400 sm:block">
        Dica:{" "}
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          1
        </kbd>
        –
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          {pergunta.opcoes.length}
        </kbd>{" "}
        pra responder rápido.
      </p>
    </div>
  );
}
