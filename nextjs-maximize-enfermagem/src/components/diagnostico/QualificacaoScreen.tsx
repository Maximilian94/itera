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
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_DURATION_MS = 500;

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
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleResponder(value: QualificacaoValue) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(value);
    timerRef.current = setTimeout(() => onResponder(value), ADVANCE_DELAY_MS);
  }

  function getRadioButtons(): HTMLButtonElement[] {
    return Array.from(
      groupRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      ) ?? [],
    );
  }

  function focusByIndex(idx: number) {
    const buttons = getRadioButtons();
    if (buttons.length === 0) return;
    const wrapped = ((idx % buttons.length) + buttons.length) % buttons.length;
    buttons[wrapped]?.focus();
  }

  function getFocusedIdx(): number {
    const buttons = getRadioButtons();
    return buttons.findIndex((b) => b === document.activeElement);
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

      if (e.key === "ArrowLeft") {
        if (onVoltar) {
          e.preventDefault();
          onVoltar();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        const cur = getFocusedIdx();
        if (cur >= 0) {
          e.preventDefault();
          handleResponder(pergunta.opcoes[cur].value);
          return;
        }
        if (selecionada) {
          e.preventDefault();
          handleResponder(selecionada);
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const cur = getFocusedIdx();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const next =
          cur === -1
            ? dir === 1
              ? 0
              : pergunta.opcoes.length - 1
            : cur + dir;
        focusByIndex(next);
        return;
      }

      if (e.key === "Enter") {
        const focused = document.activeElement as HTMLElement | null;
        const isRadioFocused =
          focused?.tagName === "BUTTON" &&
          focused.getAttribute("role") === "radio";
        if (isRadioFocused) return;
        if (selecionada) {
          e.preventDefault();
          handleResponder(selecionada);
        }
        return;
      }

      if (e.key.length !== 1) return;
      if (e.key < "1" || e.key > "9") return;
      const idx = Number(e.key) - 1;
      if (idx < 0 || idx >= pergunta.opcoes.length) return;
      e.preventDefault();
      handleResponder(pergunta.opcoes[idx].value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pergunta.opcoes, onVoltar, selecionada]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startT = 0;

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
    }

    function onTouchEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > SWIPE_MAX_DURATION_MS) return;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.7) return;
      if (dx > 0) {
        if (onVoltar) onVoltar();
      } else if (selecionada) {
        handleResponder(selecionada);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onVoltar, selecionada]);

  const activeValue = pending ?? selecionada;

  return (
    <div className="anim-fade-up flex w-full max-w-2xl flex-col">
      {onVoltar ? (
        <button
          type="button"
          onClick={onVoltar}
          className="mb-3 -ml-1.5 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Voltar
        </button>
      ) : null}

      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
        Pra entendermos seu contexto · {pergunta.ordem} de {ordemTotal}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-balance text-2xl font-semibold leading-snug text-sky-900 outline-none sm:text-3xl"
      >
        {pergunta.enunciado}
      </h2>

      <ul
        ref={groupRef}
        className="mt-8 space-y-3"
        role="radiogroup"
        aria-label={pergunta.enunciado}
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
                className={`group flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
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
        Atalhos: <Kbd>1</Kbd>–<Kbd>{pergunta.opcoes.length}</Kbd> responde ·{" "}
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> navega · <Kbd>←</Kbd> volta · <Kbd>→</Kbd> avança ·{" "}
        <Kbd>Enter</Kbd> confirma
      </p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
      {children}
    </kbd>
  );
}
