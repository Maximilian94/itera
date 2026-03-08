/**
 * Variables for the published Resend "payment-failed" template.
 */

export interface PaymentFailedTemplateParams {
  updateBillingUrl: string;
  firstName?: string;
}

export function getPaymentFailedGreeting(
  params: Pick<PaymentFailedTemplateParams, 'firstName'>,
): string {
  const firstName = params.firstName?.trim();
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}