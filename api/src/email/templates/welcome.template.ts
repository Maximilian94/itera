/**
 * Welcome template for new users.
 * Friendly tone, CTA to start studying.
 */

export interface WelcomeTemplateParams {
  firstName?: string;
}

export function getWelcomeSubject(params: WelcomeTemplateParams): string {
  // Sugestão: personalizar assunto quando tiver firstName
  return params.firstName
    ? `Bem-vindo(a), ${params.firstName}! Bora fazer seu 1º treino? 💪`
    : 'Bem-vindo(a) ao Maximize Enfermagem! Bora fazer seu 1º treino? 💪';
}

export function getWelcomeHtml(params: WelcomeTemplateParams): string {
  const greeting = params.firstName ? `Olá, ${params.firstName}!` : 'Olá!';

  const primaryUrl = 'https://app.maximizeenfermagem.com.br';
  const secondaryUrl = 'https://app.maximizeenfermagem.com.br/provas'; // ajuste se existir
  const supportUrl = 'https://app.maximizeenfermagem.com.br/ajuda'; // ajuste se existir

  const preheader =
    'Escolha uma prova, responda questões reais e receba feedback na hora.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Bem-vindo ao Maximize Enfermagem</title>
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
          <!-- Top / Brand -->
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
              <h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.25;font-weight:700;color:#18181b;">
                ${greeting}
              </h1>

              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Bem-vindo(a) ao <strong>Maximize Enfermagem</strong> — aqui você treina com <strong>questões reais</strong>,
                identifica seus <strong>pontos fracos</strong> e evolui com um <strong>plano claro</strong>.
              </p>

              <p style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                Como funciona (bem simples):
              </p>

              <ul style="margin:0 0 22px 18px;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3f3f46;">
                <li style="margin:0 0 6px 0;">Escolha uma prova (ou banca/cargo)</li>
                <li style="margin:0 0 6px 0;">Faça um treino rápido</li>
                <li style="margin:0;">Receba feedback imediato e acompanhe sua evolução</li>
              </ul>

              <!-- Bulletproof button (Outlook-friendly) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 10px 0;">
                <tr>
                  <td align="left">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${primaryUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" stroke="f" fillcolor="#0ea5e9">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;">
                          Fazer meu 1º treino
                        </center>
                      </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                      <a href="${primaryUrl}"
                        style="display:inline-block;background-color:#0ea5e9;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:44px;height:44px;padding:0 18px;border-radius:8px;">
                        Fazer meu 1º treino
                      </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 22px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#52525b;">
                Prefere explorar primeiro? <a href="${secondaryUrl}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">Ver provas disponíveis</a>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">

<p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
  Ficou com alguma dúvida?
  Fale direto com a gente pelo e-mail
  <a href="mailto:contato@maximizeenfermagem.com.br"
     style="color:#0ea5e9;text-decoration:none;font-weight:600;">
     contato@maximizeenfermagem.com.br
  </a>.
</p>

              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#71717a;">
                — Equipe Maximize Enfermagem
              </p>

              <p style="margin:14px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <span style="color:#71717a;">${primaryUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 4px 0 4px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Você recebeu este e-mail porque criou uma conta no Maximize Enfermagem.
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