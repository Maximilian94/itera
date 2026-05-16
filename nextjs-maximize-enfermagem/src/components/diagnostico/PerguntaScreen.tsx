"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckIcon } from "@heroicons/react/20/solid";
import type { Pergunta } from "@/data/diagnostico/perguntas";
import type { Alternativa } from "@/lib/diagnostico/types";

interface PerguntaScreenProps {
  pergunta: Pergunta;
  selecionada?: Alternativa;
  onResponder: (alt: Alternativa) => void;
  onVoltar?: () => void;
}

const ADVANCE_DELAY_MS = 320;

export function PerguntaScreen({
  pergunta,
  selecionada,
  onResponder,
  onVoltar,
}: PerguntaScreenProps) {
  const [pending, setPending] = useState<Alternativa | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleResponder(alt: Alternativa) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(alt);
    timerRef.current = setTimeout(() => onResponder(alt), ADVANCE_DELAY_MS);
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

      let idx = -1;
      const k = e.key.toUpperCase();
      if (k >= "A" && k <= "D") idx = k.charCodeAt(0) - 65;
      else if (k >= "1" && k <= "4") idx = Number(k) - 1;

      if (idx < 0 || idx >= pergunta.alternativas.length) return;
      e.preventDefault();
      handleResponder(pergunta.alternativas[idx].key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pergunta.alternativas]);

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

  const activeAlt = pending ?? selecionada;

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
        Pergunta {pergunta.ordem} de 10
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
        {pergunta.alternativas.map((alt, index) => {
          const isActive = activeAlt === alt.key;
          const isPending = pending === alt.key;
          const badge = String.fromCharCode(65 + index);
          return (
            <li key={alt.key}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleResponder(alt.key)}
                className={`group flex w-full items-start gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                  isActive
                    ? "border-cyan-600 bg-cyan-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30"
                } ${isPending ? "scale-[1.015]" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-cyan-100 group-hover:text-cyan-700"
                  }`}
                >
                  {isPending ? <CheckIcon className="size-4" /> : badge}
                </span>
                <span className="flex-1 text-base leading-relaxed text-slate-700">
                  {alt.texto}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 hidden text-xs text-slate-400 sm:block">
        Dica: use{" "}
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          A
        </kbd>
        –
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          D
        </kbd>{" "}
        ou{" "}
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          ↑
        </kbd>
        <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          ↓
        </kbd>{" "}
        pra navegar.
      </p>
    </div>
  );
}
