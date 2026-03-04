/**
 * Inactivity reminder template.
 * Sent after 3 or 7 days without use, encourages return.
 */

export interface InactivityReminderTemplateParams {
  daysInactive: 3 | 7;
  resumeUrl: string;
  firstName?: string;
}

export function getInactivityReminderSubject(
  params: InactivityReminderTemplateParams,
): string {
  return params.daysInactive === 3
    ? 'Bora retomar? Um treino curtinho hoje já ajuda 💪'
    : 'Uma semana sem treinar — que tal voltar no seu ritmo? 💙';
}

export function getInactivityReminderHtml(
  params: InactivityReminderTemplateParams,
): string {
  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';
  const supportEmail = 'contato@maximizeenfermagem.com.br';

  const daysText = params.daysInactive === 3 ? '3 dias' : 'uma semana';

  const title =
    params.daysInactive === 3 ? 'Só passando pra te lembrar 👋' : 'A gente te espera por aqui 💙';

  const mainCopy =
    params.daysInactive === 3
      ? `Faz ${daysText} que você não aparece no Maximize Enfermagem. Se a rotina apertou, tá tudo certo — o importante é não perder o ritmo por muito tempo.`
      : `Faz ${daysText} que você não acessa o Maximize Enfermagem. Se você deu uma pausa, sem problemas — sempre dá pra recomeçar, sem peso e no seu tempo.`;

  const nudge =
    params.daysInactive === 3
      ? 'Sugestão pra hoje: faça um treino curto (5–10 questões) só pra aquecer.'
      : 'Sugestão pra voltar sem esforço: comece com um treino curto (5–10 questões) e vá aumentando aos poucos.';

  const preheader =
    params.daysInactive === 3
      ? 'Um treino curto de 5–10 questões já coloca você de volta no ritmo.'
      : 'Volte no seu ritmo: comece com 5–10 questões e retome a consistência.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Lembrete de inatividade</title>
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
                ${title}
              </h1>

              <p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                ${greeting} ${mainCopy}
              </p>

              <!-- Gentle tip box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;">
                <tr>
                  <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 14px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e3a8a;">
                      <strong>Dica prática:</strong> ${nudge}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Quando você treina com frequência, seu cérebro aprende mais rápido — mesmo com sessões curtinhas.
              </p>

              <!-- CTA (bulletproof) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${params.resumeUrl}" style="height:44px;v-text-anchor:middle;width:230px;" arcsize="14%" stroke="f" fillcolor="#0ea5e9">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Retomar com treino curto
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${params.resumeUrl}"
                        style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Retomar com treino curto
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <span style="color:#71717a;">${params.resumeUrl}</span>
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
                Você recebeu este lembrete porque ficou ${daysText} sem treinar no Maximize Enfermagem.
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