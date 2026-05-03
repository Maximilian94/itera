import type {
  DiagnosticoResultado,
  ScoreSecundario,
  SecondaryScoreCategoria,
} from '@domain/diagnostico/diagnostico.interface';

/**
 * Variables for the published Resend "diagnostico-resultado" template.
 *
 * Template recebe scores como strings já formatadas com '%' (decisão do doc:
 * "padrão atual: strings planas"). PONTO_FORTE e PONTO_ATENCAO viram labels
 * em PT-BR — o texto explicativo completo fica na tela de resultado, o email
 * é uma versão mais curta.
 */

export interface DiagnosticoResultadoTemplateParams {
  firstName?: string;
  resultado: DiagnosticoResultado;
}

const CATEGORIA_LABEL: Record<SecondaryScoreCategoria, string> = {
  clarezaDirecao: 'Clareza de Direção',
  consistencia: 'Consistência',
  qualidadeMetodo: 'Qualidade do Método',
  retencao: 'Retenção',
};

function findScore(
  scores: ScoreSecundario[],
  categoria: SecondaryScoreCategoria,
): ScoreSecundario | undefined {
  return scores.find((s) => s.categoria === categoria);
}

function formatPercentage(score?: ScoreSecundario): string {
  if (!score) return '0%';
  return `${Math.round(score.percentage)}%`;
}

export function buildDiagnosticoResultadoVariables(
  params: DiagnosticoResultadoTemplateParams,
) {
  const { resultado } = params;

  const greeting = params.firstName?.trim()
    ? `Olá, ${params.firstName.trim()}!`
    : 'Olá!';

  return {
    GREETING: greeting,
    PERFIL_NOME: resultado.perfil.nome,
    PERFIL_MENSAGEM: resultado.perfil.mensagemPrincipal,
    TOTAL_SCORE: String(resultado.totalScore),
    SCORE_CLAREZA: formatPercentage(findScore(resultado.scores, 'clarezaDirecao')),
    SCORE_CONSISTENCIA: formatPercentage(
      findScore(resultado.scores, 'consistencia'),
    ),
    SCORE_METODO: formatPercentage(
      findScore(resultado.scores, 'qualidadeMetodo'),
    ),
    SCORE_RETENCAO: formatPercentage(findScore(resultado.scores, 'retencao')),
    PONTO_FORTE: CATEGORIA_LABEL[resultado.pontoForte.categoria],
    PONTO_ATENCAO: CATEGORIA_LABEL[resultado.pontoAtencao.categoria],
    PROXIMO_PASSO: resultado.proximoPasso,
    CTA_URL: 'https://app.maximizeenfermagem.com.br',
    SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
  };
}
