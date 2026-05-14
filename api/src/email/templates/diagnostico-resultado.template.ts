import type {
  DiagnosticoResultado,
  ProfileSlug,
  ScoreSecundario,
  SecondaryScoreCategoria,
} from '@domain/diagnostico/diagnostico.interface';

/**
 * Variables for the published Resend "diagnostico-*" templates.
 *
 * O design do email tem **um template Resend por perfil** (sobrecarregado,
 * esforçado_sem_direcao, em_evolucao, estrategico). Cada template tem o
 * texto do perfil hardcoded no HTML — só recebemos do backend dados
 * personalizados: nome, scores e CTA.
 *
 * Os 4 templates compartilham o mesmo conjunto de variáveis pra simplificar
 * a integração. Scores vão como número (ex: "67"), porque o template já
 * adiciona o "%" no HTML.
 *
 * Mapping perfil → templateId em PERFIL_TO_RESEND_TEMPLATE_ID. Os slugs do
 * Resend perderam alguns acentos (normalização interna deles); use EXATO
 * como estão aqui — qualquer typo quebra o envio.
 */

export interface DiagnosticoResultadoTemplateParams {
  firstName?: string;
  resultado: DiagnosticoResultado;
}

export const PERFIL_TO_RESEND_TEMPLATE_ID: Record<ProfileSlug, string> = {
  sobrecarregado: 'diagnostico-estudante-sobrecarregado',
  esforcado_sem_direcao: 'diagnstico-esforado-sem-direo',
  em_evolucao: 'diagnstico-estudante-em-evoluo',
  estrategico: 'diagnstico-estudante-estratgico',
};

function findScorePercentage(
  scores: ScoreSecundario[],
  categoria: SecondaryScoreCategoria,
): string {
  const score = scores.find((s) => s.categoria === categoria);
  if (!score) return '0';
  return String(Math.round(score.percentage));
}

export function buildDiagnosticoResultadoVariables(
  params: DiagnosticoResultadoTemplateParams,
) {
  const { resultado } = params;
  const leadName = params.firstName?.trim() || 'estudante';

  return {
    LEAD_NAME: leadName,
    DIRECTION_SCORE: findScorePercentage(resultado.scores, 'clarezaDirecao'),
    CONSISTENCY_SCORE: findScorePercentage(resultado.scores, 'consistencia'),
    METHOD_SCORE: findScorePercentage(resultado.scores, 'qualidadeMetodo'),
    RETENTION_SCORE: findScorePercentage(resultado.scores, 'retencao'),
    CTA_URL: 'https://app.maximizeenfermagem.com.br',
  };
}
