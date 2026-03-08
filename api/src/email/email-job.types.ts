/**
 * Tipos discriminados para jobs de email na fila BullMQ.
 * Cada job tem um `type` e payload específico para type-safety.
 */

export type EmailJobType =
  | 'welcome'
  | 'subscription_activated'
  | 'payment_failed'
  | 'subscription_canceled'
  | 'first_training_completed'
  | 'inactivity_reminder'
  | 'email_verified';

export type EmailSource = 'clerk' | 'stripe' | 'system';

export interface EmailJobBase {
  /** Origem do evento (clerk, stripe, system) */
  source: EmailSource;
  /** ID externo do evento (ex: evt_xxx do Clerk, evt_xxx do Stripe) */
  externalEventId?: string;
}

export interface WelcomeEmailJob extends EmailJobBase {
  type: 'welcome';
  to: string;
  /** Clerk user ID - usado para jobId determinístico */
  clerkUserId: string;
  params: { firstName?: string };
}

export interface SubscriptionActivatedEmailJob extends EmailJobBase {
  type: 'subscription_activated';
  to: string;
  /** Stripe subscription ID - usado para jobId determinístico */
  subscriptionId: string;
  params: { planName: string; firstName?: string };
}

export interface PaymentFailedEmailJob extends EmailJobBase {
  type: 'payment_failed';
  to: string;
  /** Stripe invoice ID - usado para jobId determinístico */
  invoiceId: string;
  params: { updateBillingUrl: string; firstName?: string };
}

export interface SubscriptionCanceledEmailJob extends EmailJobBase {
  type: 'subscription_canceled';
  to: string;
  /** Stripe subscription ID - usado para jobId determinístico */
  subscriptionId: string;
  params: { planName?: string; firstName?: string };
}

export interface FirstTrainingCompletedEmailJob extends EmailJobBase {
  type: 'first_training_completed';
  to: string;
  /** Training session ID - usado para jobId determinístico */
  trainingSessionId: string;
  params: {
    scorePercent: number;
    totalQuestions: number;
    firstName?: string | null;
  };
}

export interface InactivityReminderEmailJob extends EmailJobBase {
  type: 'inactivity_reminder';
  to: string;
  /** User ID - usado para jobId determinístico */
  userId: string;
  params: { daysInactive: 3 | 7; resumeUrl: string };
}

export interface EmailVerifiedEmailJob extends EmailJobBase {
  type: 'email_verified';
  to: string;
  /** Clerk user ID - usado para jobId determinístico e UserEmailEvent após envio */
  clerkUserId: string;
  params: { firstName?: string };
}

export type EmailJobPayload =
  | WelcomeEmailJob
  | SubscriptionActivatedEmailJob
  | PaymentFailedEmailJob
  | SubscriptionCanceledEmailJob
  | FirstTrainingCompletedEmailJob
  | InactivityReminderEmailJob
  | EmailVerifiedEmailJob;

/** Gera jobId determinístico para deduplicação. BullMQ não permite ':' no jobId. */
export function getEmailJobId(payload: EmailJobPayload): string {
  switch (payload.type) {
    case 'welcome':
      return `welcome_${payload.clerkUserId}`;
    case 'subscription_activated':
      return `subscription_activated_${payload.subscriptionId}`;
    case 'payment_failed':
      return `payment_failed_${payload.invoiceId}`;
    case 'subscription_canceled':
      return `subscription_canceled_${payload.subscriptionId}`;
    case 'first_training_completed':
      return `first_training_completed_${payload.trainingSessionId}`;
    case 'inactivity_reminder':
      return `inactivity_reminder_${payload.userId}_${payload.params.daysInactive}`;
    case 'email_verified':
      return `email_verified_${payload.clerkUserId}`;
    default:
      return `${(payload as EmailJobPayload).type}_${Date.now()}`;
  }
}
