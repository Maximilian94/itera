/**
 * Barrel export for email template helpers.
 */

export {
  getWelcomeGreeting,
  type WelcomeTemplateParams,
} from './welcome.template';

export {
  getSubscriptionActivatedGreeting,
  type SubscriptionActivatedTemplateParams,
} from './subscription-activated.template';

export {
  getPaymentFailedGreeting,
  type PaymentFailedTemplateParams,
} from './payment-failed.template';

export {
  getSubscriptionCanceledGreeting,
  getSubscriptionCanceledPlanText,
  type SubscriptionCanceledTemplateParams,
} from './subscription-canceled.template';

export {
  buildFirstTrainingCompletedEmailVariables,
  type FirstTrainingCompletedTemplateParams,
} from './first-training-completed.template';

export {
  getInactivityReminderSubject,
  getInactivityReminderHtml,
  type InactivityReminderTemplateParams,
} from './inactivity-reminder.template';

export {
  getEmailVerifiedGreeting,
  type EmailVerifiedTemplateParams,
} from './email-verified.template';
