/**
 * EmailService USAGE EXAMPLE
 * ==========================
 *
 * This file demonstrates how to inject and use EmailService in any
 * NestJS service or controller. Not imported at runtime — reference only.
 *
 * To use in a module:
 * 1. Import EmailModule in your module (e.g. AuthModule, StripeModule)
 * 2. Inject EmailService in the constructor
 * 3. Call methods as needed
 */

/*
// --- Example in AuthService (welcome after signup) ---

@Injectable()
export class AuthService {
  constructor(private readonly emailService: EmailService) {}

  async afterUserSignUp(userId: string, email: string, firstName?: string) {
    // ... user creation logic ...

    await this.emailService.sendWelcomeEmail(email, { firstName });
  }
}

// --- Example in StripeWebhookHandler (subscription activated) ---

await this.emailService.sendSubscriptionActivatedEmail(user.email, {
  planName: 'Estratégico',
});

// --- Example in StripeWebhookHandler (payment failed) ---

const portalUrl = await this.stripeService.createCustomerPortalSession(...);
await this.emailService.sendPaymentFailedEmail(user.email, {
  updateBillingUrl: portalUrl.url,
});

// --- Example in TrainingService (first training completed) ---

await this.emailService.sendFirstTrainingCompletedEmail(user.email, {
  scorePercent: 75,
  totalQuestions: 20,
});

// --- Example in inactivity job (future cron/scheduler) ---

await this.emailService.sendInactivityReminderEmail(user.email, {
  daysInactive: 7,
  resumeUrl: 'https://app.maximizeenfermagem.com.br',
});
*/

export {};
