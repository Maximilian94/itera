/**
 * Welcome template for new users.
 * Uses Resend template (alias: welcome) with variables.
 * This module only provides the GREETING logic; HTML is rendered by Resend.
 */

export interface WelcomeTemplateParams {
  firstName?: string;
}

/** GREETING variable for Resend template. */
export function getWelcomeGreeting(params: WelcomeTemplateParams): string {
  const firstName = params.firstName?.trim();
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}
