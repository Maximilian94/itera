import type {
  ProfileSlug,
  SecondaryScoreCategoria,
} from "@/lib/diagnostico/types";

/**
 * 4 perfis (§5.5) por faixa de pontuação (0–30) e mapping de scores secundários
 * (§5.6: clarezaDirecao, consistencia, qualidadeMetodo, retencao).
 *
 * Ranges são fechados em ambos os lados: total ∈ [min, max].
 */

export interface Perfil {
  slug: ProfileSlug;
  nome: string;
  range: [number, number];
  mensagemPrincipal: string;
  proximoPasso: string;
}

export const PERFIS: Perfil[] = [
  {
    slug: "sobrecarregado",
    nome: "Estudante Sobrecarregado",
    range: [0, 8],
    mensagemPrincipal:
      "Você não precisa estudar mais conteúdos ao mesmo tempo. Primeiro, precisa organizar sua direção de estudo e entender quais pontos merecem prioridade agora.",
    proximoPasso:
      "Pegue o edital e separe os 3 maiores blocos. Comece estudando o que mais pesa na prova — em cima de questões reais — antes de tentar dar conta de tudo.",
  },
  {
    slug: "esforcado_sem_direcao",
    nome: "Esforçado Sem Direção",
    range: [9, 15],
    mensagemPrincipal:
      "Seu problema não parece ser falta de esforço. O que está travando sua evolução é a falta de estratégia para transformar estudo em resultado.",
    proximoPasso:
      "Troque parte do tempo de leitura passiva por questões. Use os erros para mapear pontos fracos e crie um ciclo curto: estudar → resolver → revisar erros.",
  },
  {
    slug: "em_evolucao",
    nome: "Estudante em Evolução",
    range: [16, 22],
    mensagemPrincipal:
      "Você já tem uma boa base de estudo, mas pode evoluir mais rápido se usar seus erros e dificuldades como guia principal.",
    proximoPasso:
      "Programe revisões espaçadas dos assuntos que você errou. Acompanhe seu desempenho por matéria e ataque primeiro o que cai mais e você ainda erra.",
  },
  {
    slug: "estrategico",
    nome: "Estudante Estratégico",
    range: [23, 30],
    mensagemPrincipal:
      "Você já estuda com mais consciência do que a maioria dos candidatos. Agora, seu próximo passo é refinar prioridades, revisar melhor e transformar desempenho em vantagem competitiva.",
    proximoPasso:
      "Foque em performance: simulados cronometrados, análise fina de erros e revisão dos conteúdos com maior peso no edital. Pequenos ganhos aqui decidem aprovações.",
  },
];

export interface DimensaoConfig {
  categoria: SecondaryScoreCategoria;
  perguntas: string[];
  maxScore: number;
  label: string;
}

export const SECONDARY_SCORES: DimensaoConfig[] = [
  {
    categoria: "clarezaDirecao",
    label: "Clareza de Direção",
    perguntas: ["q1", "q7", "q9"],
    maxScore: 9,
  },
  {
    categoria: "consistencia",
    label: "Consistência",
    perguntas: ["q2"],
    maxScore: 3,
  },
  {
    categoria: "qualidadeMetodo",
    label: "Qualidade do Método",
    perguntas: ["q3", "q5", "q8"],
    maxScore: 9,
  },
  {
    categoria: "retencao",
    label: "Retenção",
    perguntas: ["q4", "q6"],
    maxScore: 6,
  },
];
