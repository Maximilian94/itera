"use client";

import { useEffect } from "react";

interface AnalyzingScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

/**
 * Tela de transição "analisando suas respostas". Cumpre dois papéis:
 *  - dá tempo pro estado interno do wizard computar o resultado
 *  - faz o resultado parecer mais elaborado do que regras simples
 */
export function AnalyzingScreen({
  onComplete,
  durationMs = 3500,
}: AnalyzingScreenProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, durationMs);
    return () => clearTimeout(t);
  }, [onComplete, durationMs]);

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <div className="relative size-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-cyan-200 opacity-60" />
        <div className="absolute inset-2 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      </div>

      <h2 className="mt-8 text-2xl font-semibold text-sky-900">
        Analisando suas respostas...
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Estamos identificando seu perfil de estudo e os pontos que mais
        impactam sua evolução.
      </p>
    </div>
  );
}
