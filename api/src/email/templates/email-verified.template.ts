/**
 * Variables for the published Resend "email-verified" template.
 */

export interface EmailVerifiedTemplateParams {
  firstName?: string;
}

export function getEmailVerifiedGreeting(
  params: EmailVerifiedTemplateParams,
): string {
  const firstName = params.firstName?.trim();
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}
