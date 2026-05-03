import { PERFIS, SECONDARY_SCORES } from "@/data/diagnostico/perfis";
import type {
  Alternativa,
  DiagnosticoResultado,
  ScoreSecundario,
} from "./types";

/**
 * Pure-function scoring (decisão arquitetural §4): wizard frontend é dono do
 * scoring; backend recebe o `resultado` opaco e renderiza o email com base
 * nele. Mudar copy/scoring vira PR só no front.
 *
 * Tradeoff aceito: cliente pode mandar resultado fakeado — só prejudica a si.
 */

const ANSWER_SCORES: Record<Alternativa, number> = { A: 3, B: 2, C: 1, D: 0 };

function pontosPorPergunta(
  respostas: Record<string, Alternativa>,
  perguntaIds: string[],
): number {
  return perguntaIds.reduce((acc, id) => {
    const alt = respostas[id];
    return acc + (alt ? ANSWER_SCORES[alt] : 0);
  }, 0);
}

function escolherPerfil(totalScore: number) {
  return PERFIS.find(
    (p) => totalScore >= p.range[0] && totalScore <= p.range[1],
  ) ?? PERFIS[PERFIS.length - 1];
}

export function computeResultado(
  respostas: Record<string, Alternativa>,
): DiagnosticoResultado {
  const totalScore = Object.values(respostas).reduce(
    (acc, alt) => acc + ANSWER_SCORES[alt],
    0,
  );

  const scores: ScoreSecundario[] = SECONDARY_SCORES.map((dim) => {
    const score = pontosPorPergunta(respostas, dim.perguntas);
    return {
      categoria: dim.categoria,
      score,
      maxScore: dim.maxScore,
      percentage: Math.round((score / dim.maxScore) * 100),
    };
  });

  // Maior percentage = ponto forte; menor = ponto de atenção.
  // Tie-breaker: ordem em SECONDARY_SCORES.
  const ordenadoDesc = [...scores].sort((a, b) => b.percentage - a.percentage);
  const pontoForte = ordenadoDesc[0];
  const pontoAtencao = ordenadoDesc[ordenadoDesc.length - 1];

  const perfilConfig = escolherPerfil(totalScore);

  return {
    totalScore,
    perfil: {
      slug: perfilConfig.slug,
      nome: perfilConfig.nome,
      mensagemPrincipal: perfilConfig.mensagemPrincipal,
    },
    scores,
    pontoForte,
    pontoAtencao,
    proximoPasso: perfilConfig.proximoPasso,
  };
}
