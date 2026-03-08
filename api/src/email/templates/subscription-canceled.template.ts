/**
 * Variables for the published Resend "subscription-canceled" template.
 */

export interface SubscriptionCanceledTemplateParams {
  planName?: string;
  firstName?: string;
}

export function getSubscriptionCanceledGreeting(
  params: Pick<SubscriptionCanceledTemplateParams, 'firstName'>,
): string {
  const firstName = params.firstName?.trim();
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}

export function getSubscriptionCanceledPlanText(
  params: Pick<SubscriptionCanceledTemplateParams, 'planName'>,
): string {
  const planName = params.planName?.trim();
  return planName ? ` do plano <strong>${planName}</strong>` : '';
}
