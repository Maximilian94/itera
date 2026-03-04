import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkWebhookService } from './clerk-webhook.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Clerk webhook module: user.created, user.updated, user.deleted.
 * Validates Svix signature, processes with idempotency, dispatches emails via EmailModule.
 */
@Module({
  imports: [PrismaModule, AuthModule, EmailModule],
  controllers: [ClerkWebhookController],
  providers: [ClerkWebhookService],
})
export class ClerkModule {}
