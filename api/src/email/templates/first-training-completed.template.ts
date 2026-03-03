/**
 * Template sent after first training completed.
 * Congratulates, shows performance, and nudges next action.
 */

export interface FirstTrainingCompletedTemplateParams {
  scorePercent: number;      // 0..100
  totalQuestions: number;    // >= 0
  firstName?: string;
}

export function getFirstTrainingCompletedSubject(
  _params: FirstTrainingCompletedTemplateParams,
): string {
  return 'Parabéns! Você concluiu seu primeiro treino 🎯';
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getFirstTrainingCompletedHtml(
  params: FirstTrainingCompletedTemplateParams,
): string {
  const score = clamp(Math.round(params.scorePercent), 0, 100);

  const total = Math.max(0, Math.floor(params.totalQuestions));
  const correctCount =
    total > 0 ? Math.round((score / 100) * total) : 0;

  const scoreText =
    total > 0 ? `${correctCount} de ${total} questões` : `${score}%`;

  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';

  // Mensagem adaptativa (sem “shame”, sempre pra cima)
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

  const appUrl = 'https://app.maximizeenfermagem.com.br';
  const supportEmail = 'contato@maximizeenfermagem.com.br';

  const preheader = `Resultado do treino: ${scoreText}. Continue evoluindo com o próximo treino.`;

  // Cores do “badge” por faixa (mantendo acessível e amigável)
  const badgeBg =
    score >= 80 ? '#dcfce7' : score >= 60 ? '#e0f2fe' : score >= 40 ? '#fef9c3' : '#ffe4e6';
  const badgeText =
    score >= 80 ? '#166534' : score >= 60 ? '#075985' : score >= 40 ? '#854d0e' : '#9f1239';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Primeiro treino concluído</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f4f5;color:#18181b;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 0 12px 0;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#52525b;">
                <strong style="color:#0ea5e9;">Maximize Enfermagem</strong>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h1 style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:800;color:#18181b;">
                ${headline}
              </h1>

              <p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                ${greeting} Você concluiu seu <strong>primeiro treino</strong> no Maximize Enfermagem. 🎯
              </p>

              <!-- Result block -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e4e4e7;border-radius:12px;padding:14px 14px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" style="padding:0 0 10px 0;">
                          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${badgeBg};color:${badgeText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;">
                            ${score}% de acerto
                          </span>
                        </td>
                        <td align="right" style="padding:0 0 10px 0;">
                          <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#52525b;">
                            <strong style="color:#18181b;">Resultado:</strong> ${scoreText}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Progress bar (table-based for email compatibility) -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:#e4e4e7;border-radius:999px;height:10px;overflow:hidden;">
                          <div style="width:${score}%;height:10px;background-color:#0ea5e9;border-radius:999px;"></div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:10px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#52525b;">
                      ${coachingLine}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Next step -->
              <p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Quer manter o ritmo? O melhor próximo passo é fazer <strong>mais um treino</strong> (mesmo que curto) e revisar os erros.
              </p>

              <!-- Bulletproof button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${appUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="#0ea5e9">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Fazer outro treino
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${appUrl}"
                        style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Fazer outro treino
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Se o botão não funcionar, copie e cole este link no navegador: <span style="color:#71717a;">${appUrl}</span>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0;">

              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                Precisa de ajuda? Responda este e-mail ou escreva para
                <a href="mailto:${supportEmail}" style="color:#0ea5e9;text-decoration:none;font-weight:700;">
                  ${supportEmail}
                </a>.
              </p>

              <p style="margin:10px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                — Equipe Maximize Enfermagem
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 4px 0 4px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Você recebeu este e-mail porque concluiu seu primeiro treino no Maximize Enfermagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}