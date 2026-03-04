/**
 * Template sent when user verifies their primary email.
 * Confirms verification and encourages them to access the app.
 */

export interface EmailVerifiedTemplateParams {
  firstName?: string;
  dashboardUrl: string;
}

export function getEmailVerifiedSubject(
  _params: EmailVerifiedTemplateParams,
): string {
  return 'E-mail verificado com sucesso! ✅';
}

export function getEmailVerifiedHtml(
  params: EmailVerifiedTemplateParams,
): string {
  const greeting = params.firstName
    ? `Olá, ${params.firstName}!`
    : 'Olá!';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-mail verificado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
          E-mail verificado com sucesso! ✅
        </h1>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
          ${greeting}
        </p>
        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
          Seu e-mail foi confirmado. Agora você pode acessar o app e começar a estudar com provas reais.
        </p>
        <p style="margin: 0;">
          <a href="${params.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px;">
            Acessar o app
          </a>
        </p>
        <p style="margin: 32px 0 0; font-size: 14px; color: #71717a;">
          Equipe Maximize Enfermagem
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
