/**
 * Template sent when subscription is canceled.
 * Positive, respectful tone, easy return path.
 */

export interface SubscriptionCanceledTemplateParams {
  planName?: string;
  firstName?: string;
}

export function getSubscriptionCanceledSubject(
  params: SubscriptionCanceledTemplateParams,
): string {
  const plan = params.planName ? ` (${params.planName})` : '';
  return `Tudo certo ✅ sua assinatura${plan} foi cancelada`;
}

export function getSubscriptionCanceledHtml(
  params: SubscriptionCanceledTemplateParams,
): string {
  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';
  const planText = params.planName ? ` do plano <strong>${params.planName}</strong>` : '';
  const appUrl = 'https://app.maximizeenfermagem.com.br';
  const supportEmail = 'contato@maximizeenfermagem.com.br';

  const preheader =
    'Foi muito bom ter você por aqui. Quando fizer sentido, é só retomar seus treinos.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Assinatura cancelada</title>
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
                Tudo certo ✅
              </h1>

              <p style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                ${greeting} Confirmamos o cancelamento da sua assinatura${planText}.
              </p>

              <!-- Positive message box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
                <tr>
                  <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 14px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e3a8a;">
                      Foi muito bom ter você por aqui 💙<br>
                      A gente torce para que seus estudos continuem avançando — do seu jeito, no seu tempo.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Quando fizer sentido voltar, é só entrar no app e retomar seus treinos.
              </p>

              <!-- CTA (bulletproof) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${appUrl}" style="height:44px;v-text-anchor:middle;width:210px;" arcsize="14%" stroke="f" fillcolor="#0ea5e9">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Voltar ao app
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${appUrl}"
                        style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Voltar ao app
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                (Se o botão não funcionar, copie e cole este link no navegador: <span style="color:#71717a;">${appUrl}</span>)
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0;">

              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                Se tiver qualquer dúvida, é só responder este e-mail ou escrever para
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
                Você recebeu este e-mail para confirmar o cancelamento da sua assinatura.
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