import type { Pergunta } from "@/data/diagnostico/perguntas";

/**
 * Shuffles a ordem das `alternativas` de cada pergunta. Mantém o `key`
 * (A/B/C/D) intacto em cada alternativa — é ele que carrega o score via
 * ANSWER_SCORES em scoring.ts.
 *
 * O badge mostrado na UI passa a vir da posição shuffled (não do `alt.key`),
 * então quem sempre clica "na primeira opção" ou "sempre A" não consegue
 * gamear o resultado. A ordem das perguntas em si NÃO é alterada — algumas
 * dependem do contexto narrativo das anteriores.
 *
 * Pure function. Fisher-Yates clássico com Math.random — não precisa de
 * crypto-grade randomness aqui (não é segredo, é só anti-gaming superficial).
 */
export function shuffleAlternativas(perguntas: Pergunta[]): Pergunta[] {
  return perguntas.map((p) => ({
    ...p,
    alternativas: fisherYates(p.alternativas),
  }));
}

function fisherYates<T>(arr: readonly T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
