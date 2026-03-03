import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailPreviewController } from './email-preview.controller';
import { EmailService } from './email.service';
import { emailConfig } from './email.config';
import { ResendClientProvider } from './providers/resend-client.provider';

/**
 * Transactional email module via Resend.
 *
 * Loads emailConfig (RESEND_API_KEY_PROD, EMAIL_FROM) and validates on boot.
 * Exports EmailService for use in other modules (Auth, Stripe, Training, etc.).
 *
 * Structure ready to grow:
 * - Phase 3: BullMQ for queues, Clerk/Stripe webhooks
 * - Future: React Email for templates
 */
@Module({
  imports: [ConfigModule.forFeature(emailConfig)],
  controllers: [EmailPreviewController],
  providers: [ResendClientProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
