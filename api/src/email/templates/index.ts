/**
 * Barrel export for email templates.
 * Each template exports subject + html as functions that receive params.
 * Structure ready for future React Email migration (replace HTML functions
 * with React components).
 */

export {
  getWelcomeSubject,
  getWelcomeHtml,
  type WelcomeTemplateParams,
} from './welcome.template';

export {
  getSubscriptionActivatedSubject,
  getSubscriptionActivatedHtml,
  type SubscriptionActivatedTemplateParams,
} from './subscription-activated.template';

export {
  getPaymentFailedSubject,
  getPaymentFailedHtml,
  type PaymentFailedTemplateParams,
} from './payment-failed.template';

export {
  getSubscriptionCanceledSubject,
  getSubscriptionCanceledHtml,
  type SubscriptionCanceledTemplateParams,
} from './subscription-canceled.template';

export {
  getFirstTrainingCompletedSubject,
  getFirstTrainingCompletedHtml,
  type FirstTrainingCompletedTemplateParams,
} from './first-training-completed.template';

export {
  getInactivityReminderSubject,
  getInactivityReminderHtml,
  type InactivityReminderTemplateParams,
} from './inactivity-reminder.template';

export {
  getEmailVerifiedSubject,
  getEmailVerifiedHtml,
  type EmailVerifiedTemplateParams,
} from './email-verified.template';
