import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';

/**
 * Stripe webhook module: signature verification, payment logic delegation,
 * and email dispatch (subscription activated, payment failed, subscription canceled).
 * Uses WebhookEvent table for idempotency.
 */
@Module({
  imports: [PrismaModule, StripeModule, EmailModule],
  controllers: [StripeWebhookController],
  providers: [StripeWebhookService],
})
export class StripeWebhookModule {}
