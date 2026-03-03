export interface SubscriptionActivatedTemplateParams {
  planName: string;
  firstName?: string;
}

export function getSubscriptionActivatedSubject(
  params: SubscriptionActivatedTemplateParams,
): string {
  return `Pagamento confirmado ✅ Plano ${params.planName} ativo`;
}

export function getSubscriptionActivatedHtml(
  params: SubscriptionActivatedTemplateParams,
): string {
  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';
  const appUrl = 'https://app.maximizeenfermagem.com.br';
  const supportEmail = 'contato@maximizeenfermagem.com.br';

  const preheader =
    'Seu acesso já está liberado. Comece com um treino curto e receba feedback imediato.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Assinatura ativada</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f4f5;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
          <tr>
            <td style="padding:0 0 12px 0;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#52525b;">
                <strong style="color:#0ea5e9;">Maximize Enfermagem</strong>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h1 style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:800;color:#18181b;">
                Assinatura ativada com sucesso ✅
              </h1>

              <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                ${greeting} Confirmamos o pagamento e seu acesso ao plano <strong>${params.planName}</strong> já está liberado.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e4e4e7;border-radius:10px;padding:14px 14px;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;color:#52525b;">
                      <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#dcfce7;color:#166534;font-weight:700;">
                        Ativo
                      </span>
                      <span style="margin-left:10px;font-weight:700;color:#18181b;">Plano:</span>
                      <span style="color:#3f3f46;">${params.planName}</span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Para começar hoje (do jeito mais leve):
              </p>

              <ul style="margin:0 0 20px 18px;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                <li style="margin:0 0 6px 0;">Abra o app e escolha uma prova (ou banca/cargo)</li>
                <li style="margin:0 0 6px 0;">Comece por um <strong>treino curto</strong> (ex.: algumas questões)</li>
                <li style="margin:0;">Deixe a <strong>prova completa</strong> para quando tiver mais tempo — ela pode levar horas</li>
              </ul>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${appUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" stroke="f" fillcolor="#0ea5e9">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Começar meu primeiro treino
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${appUrl}"
                        style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Começar meu primeiro treino
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Se o botão não funcionar, copie e cole este link no navegador: <span style="color:#71717a;">${appUrl}</span>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:18px 0;">

              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                Precisa de ajuda? É só responder este e-mail ou escrever para
                <a href="mailto:${supportEmail}" style="color:#0ea5e9;text-decoration:none;font-weight:700;">
                  ${supportEmail}
                </a>.
              </p>

              <p style="margin:10px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                — Equipe Maximize Enfermagem
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 4px 0 4px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Você recebeu este e-mail porque sua assinatura foi ativada no Maximize Enfermagem.
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