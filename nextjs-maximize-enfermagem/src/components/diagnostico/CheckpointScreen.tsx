"use client";

import { useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

interface CheckpointScreenProps {
  current: number;
  total: number;
  onContinue: () => void;
}

const AUTO_ADVANCE_MS = 2800;

export function CheckpointScreen({
  current,
  total,
  onContinue,
}: CheckpointScreenProps) {
  useEffect(() => {
    const t = setTimeout(onContinue, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [onContinue]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === " " ||
        e.key === "Enter" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
        onContinue();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  const percentage = Math.round((current / total) * 100);
  const remaining = total - current;

  return (
    <button
      type="button"
      onClick={onContinue}
      className="flex w-full max-w-xl cursor-pointer flex-col items-center text-center focus:outline-none"
      aria-label="Continuar diagnóstico"
    >
      <div className="relative flex size-32 items-center justify-center">
        <div className="absolute inset-0 anim-glow-pulse rounded-full bg-gradient-to-br from-amber-200 via-amber-100 to-amber-50 blur-2xl" />
        <div
          className="absolute -left-4 -top-2 size-5 text-amber-400 float2"
          aria-hidden="true"
        >
          <SparklesIcon className="size-full" />
        </div>
        <div
          className="absolute -right-2 top-2 size-4 text-cyan-400 float3"
          aria-hidden="true"
        >
          <SparklesIcon className="size-full" />
        </div>
        <div
          className="absolute -bottom-1 -right-4 size-4 text-emerald-400 float1"
          aria-hidden="true"
        >
          <SparklesIcon className="size-full" />
        </div>
        <div className="anim-pop relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/40">
          <SparklesIcon
            aria-hidden="true"
            className="size-12 text-white"
          />
        </div>
      </div>

      <p
        className="anim-reveal-up mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700"
        style={{ animationDelay: "150ms" }}
      >
        {percentage}% concluído
      </p>

      <h2
        className="anim-reveal-up mt-3 text-balance text-3xl font-semibold leading-tight text-sky-900 sm:text-4xl"
        style={{ animationDelay: "260ms" }}
      >
        Você passou da metade!
      </h2>

      <p
        className="anim-reveal-up mt-4 max-w-md text-base leading-relaxed text-slate-600"
        style={{ animationDelay: "380ms" }}
      >
        Faltam só {remaining} perguntas pra montarmos seu diagnóstico.
        Segue firme — você está indo bem.
      </p>

      <div
        className="anim-reveal-up mt-10 w-full max-w-sm"
        style={{ animationDelay: "500ms" }}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Progresso
          </span>
          <span className="text-2xl font-bold text-sky-900">
            {current}
            <span className="text-base font-medium text-slate-400">
              /{total}
            </span>
          </span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className="anim-progress-fill h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-500"
            style={
              {
                "--progress-target": `${percentage}%`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div
        className="anim-reveal-up mt-10 inline-flex items-center justify-center gap-2 rounded-md bg-sky-900 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-sky-800"
        style={{ animationDelay: "620ms" }}
      >
        Continuar
        <ArrowRightIcon aria-hidden="true" className="size-5" />
      </div>

      <p
        className="anim-reveal-up mt-3 text-xs text-slate-400"
        style={{ animationDelay: "740ms" }}
      >
        Avança em alguns segundos — ou clique pra seguir agora.
      </p>
    </button>
  );
}
