/**
 * Template sent when subscription payment fails.
 * Guides user to update payment method.
 */

export interface PaymentFailedTemplateParams {
  updateBillingUrl: string;
  firstName?: string;
}

export function getPaymentFailedSubject(_params: PaymentFailedTemplateParams): string {
  return 'Ação necessária: atualizar forma de pagamento';
}

export function getPaymentFailedHtml(params: PaymentFailedTemplateParams): string {
  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';
  const supportEmail = 'contato@maximizeenfermagem.com.br';

  const preheader =
    'Atualize seu método de pagamento para evitar interrupções no acesso aos treinos.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Problema no pagamento</title>
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
                Não conseguimos processar o pagamento
              </h1>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                ${greeting} Houve um problema ao processar o pagamento da sua assinatura.
                Para manter seu acesso <strong>sem interrupções</strong>, atualize sua forma de pagamento.
              </p>

              <!-- Reasons (scan-friendly) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
                <tr>
                  <td style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 14px;">
                    <p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;color:#9a3412;font-weight:800;">
                      Motivos comuns:
                    </p>
                    <ul style="margin:0 0 0 18px;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#9a3412;">
                      <li>cartão expirado</li>
                      <li>limite atingido</li>
                      <li>dados do cartão desatualizados</li>
                      <li>bloqueio temporário do banco</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA (bulletproof) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${params.updateBillingUrl}" style="height:44px;v-text-anchor:middle;width:290px;" arcsize="14%" stroke="f" fillcolor="#e11d48">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Atualizar forma de pagamento
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${params.updateBillingUrl}"
                        style="display:inline-block;background-color:#e11d48;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Atualizar forma de pagamento
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <span style="color:#71717a;">${params.updateBillingUrl}</span>
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
                Você recebeu este e-mail porque houve uma falha na tentativa de cobrança da sua assinatura.
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