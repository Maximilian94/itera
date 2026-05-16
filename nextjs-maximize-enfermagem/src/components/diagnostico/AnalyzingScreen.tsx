"use client";

import { useEffect, useState } from "react";

interface AnalyzingScreenProps {
  /** Estágios rotacionados na tela. Com 1 item, fica estático. */
  stages?: readonly string[];
  /** ms por estágio (apenas quando stages.length > 1). */
  stageDurationMs?: number;
  /** Duração total opcional. Se informada, dispara onComplete ao fim. */
  durationMs?: number;
  /** Callback ao final de durationMs. */
  onComplete?: () => void;
  /** Etiqueta pequena acima do estágio atual. */
  eyebrow?: string;
}

const DEFAULT_STAGES = ["Analisando suas respostas..."] as const;

export function AnalyzingScreen({
  stages = DEFAULT_STAGES,
  stageDurationMs = 1800,
  durationMs,
  onComplete,
  eyebrow = "Análise em andamento",
}: AnalyzingScreenProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (stages.length <= 1) return;
    const id = setInterval(() => {
      setStageIndex((i) => (i < stages.length - 1 ? i + 1 : i));
    }, stageDurationMs);
    return () => clearInterval(id);
  }, [stages.length, stageDurationMs]);

  useEffect(() => {
    if (!durationMs || !onComplete) return;
    const t = setTimeout(onComplete, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onComplete]);

  const showDots = stages.length > 1;

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <div className="relative size-28">
        <div className="absolute inset-0 anim-glow-pulse rounded-full bg-cyan-400/30 blur-md" />
        <div className="absolute inset-2 rounded-full border-2 border-cyan-100" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-600 border-r-cyan-500 animate-spin [animation-duration:1.6s]" />
        <div className="absolute inset-5 rounded-full bg-gradient-to-br from-white via-cyan-50 to-sky-100 shadow-inner" />
        <div className="absolute inset-7 rounded-full bg-gradient-to-br from-cyan-500 to-sky-700 shadow-lg shadow-cyan-500/40" />
      </div>

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
        {eyebrow}
      </p>

      <h2
        key={stageIndex}
        className="anim-fade-up mt-3 min-h-[64px] text-2xl font-semibold text-sky-900 sm:text-[26px]"
      >
        {stages[stageIndex]}
      </h2>

      {showDots ? (
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {stages.map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 rounded-full transition-all duration-500",
                i < stageIndex
                  ? "w-5 bg-cyan-600"
                  : i === stageIndex
                    ? "w-9 bg-cyan-500"
                    : "w-5 bg-slate-200",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-sm leading-relaxed text-slate-500">
        Cruzando suas respostas com padrões da nossa base de aprovados em
        concursos de Enfermagem.
      </p>
    </div>
  );
}
