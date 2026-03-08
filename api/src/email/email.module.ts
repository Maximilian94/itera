import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailPreviewController } from './email-preview.controller';
import { EmailService } from './email.service';
import { EmailProducerService, EMAIL_QUEUE_NAME } from './email.producer';
import { EmailProcessor } from './email.processor';
import { EmailDispatchLogService } from './email-dispatch-log.service';
import { emailConfig } from './email.config';
import { ResendClientProvider } from './providers/resend-client.provider';
import { getBullConnectionOptions } from './queue.config';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Transactional email module via Resend + BullMQ.
 *
 * Loads emailConfig (RESEND_API_KEY_PROD, EMAIL_FROM) and validates on boot.
 * Exports EmailService (envio direto) e EmailProducerService (enfileiramento).
 *
 * Webhooks e services devem usar EmailProducerService para enfileirar emails.
 */
@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    PrismaModule,
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
    }),
  ],
  controllers: [EmailPreviewController],
  providers: [
    ResendClientProvider,
    EmailService,
    EmailProducerService,
    EmailDispatchLogService,
    EmailProcessor,
  ],
  exports: [EmailService, EmailProducerService],
})
export class EmailModule {}
