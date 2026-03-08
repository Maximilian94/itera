/**
 * Variables for the published Resend "first-training-completed" template.
 */

export interface FirstTrainingCompletedTemplateParams {
  scorePercent: number;
  totalQuestions: number;
  firstName?: string | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function buildFirstTrainingCompletedEmailVariables(params: {
  scorePercent: number;
  totalQuestions: number;
  firstName?: string | null;
}) {
  const score = clamp(Math.round(params.scorePercent), 0, 100);
  const total = Math.max(0, Math.floor(params.totalQuestions));

  const correctCount = total > 0
    ? Math.round((score / 100) * total)
    : 0;

  const scoreText = total > 0
    ? `${correctCount} de ${total} questões`
    : `${score}%`;

  const greeting = params.firstName?.trim()
    ? `Olá, ${params.firstName.trim()}!`
    : 'Olá!';

  const headline =
    score >= 80
      ? 'Mandou muito bem! 🔥'
      : score >= 60
        ? 'Ótimo começo! 👏'
        : score >= 40
          ? 'Boa! Agora é só ganhar ritmo 💪'
          : 'Primeiro treino feito — é assim que começa 🚀';

  const coachingLine =
    score >= 80
      ? 'Seu próximo passo é manter consistência e reforçar os detalhes.'
      : score >= 60
        ? 'Você já está no caminho certo — agora é repetir e lapidar.'
        : score >= 40
          ? 'O segredo é constância: treino curto + revisão do que errou.'
          : 'O primeiro treino serve para mapear pontos fracos. Daqui pra frente, melhora rápido.';

  const badgeBg =
    score >= 80
      ? '#dcfce7'
      : score >= 60
        ? '#e0f2fe'
        : score >= 40
          ? '#fef9c3'
          : '#ffe4e6';

  const badgeText =
    score >= 80
      ? '#166534'
      : score >= 60
        ? '#075985'
        : score >= 40
          ? '#854d0e'
          : '#9f1239';

  return {
    GREETING: greeting,
    HEADLINE: headline,
    SCORE_PERCENT: String(score),
    SCORE_TEXT: scoreText,
    COACHING_LINE: coachingLine,
    AUTH_APP_URL: 'https://app.maximizeenfermagem.com.br',
    SUPPORT_EMAIL: 'contato@maximizeenfermagem.com.br',
    BADGE_BG: badgeBg,
    BADGE_TEXT: badgeText,
  };
}