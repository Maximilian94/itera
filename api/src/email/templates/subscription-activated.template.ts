/**
 * Variables for the published Resend "subscription-activated" template.
 */

export interface SubscriptionActivatedTemplateParams {
  planName: string;
  firstName?: string;
}

export function getSubscriptionActivatedGreeting(
  params: Pick<SubscriptionActivatedTemplateParams, 'firstName'>,
): string {
  const firstName = params.firstName?.trim();
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}
