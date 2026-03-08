import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProducerService } from '../email/email.producer';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapClerkUserPayload } from './clerk.mapper';

const SOURCE_CLERK = 'clerk';

export interface ClerkWebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Processes Clerk webhook events with idempotency and email dispatch.
 * Handles user.created (welcome email) and user.updated (email verified).
 */
@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly emailProducer: EmailProducerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Main entry: process event with idempotency. Returns true if processed, false if ignored (duplicate).
   */
  async processEvent(payload: ClerkWebhookPayload): Promise<void> {
    const { id: eventId, type: eventType, data } = payload;

    this.logger.log(`Processing Clerk webhook: eventType=${eventType}, eventId=${eventId}`);

    // Idempotency: skip if already processed
    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        source_eventId: { source: SOURCE_CLERK, eventId },
      },
    });

    if (existing) {
      this.logger.log(`Clerk webhook already processed: eventId=${eventId}, status=${existing.status}`);
      return;
    }

    try {
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(data);
          break;
        default:
          this.logger.log(`Clerk webhook ignored: eventType=${eventType}`);
          await this.prisma.webhookEvent.create({
            data: {
              source: SOURCE_CLERK,
              eventId,
              eventType,
              status: 'ignored',
            },
          });
          return;
      }

      await this.prisma.webhookEvent.create({
        data: {
          source: SOURCE_CLERK,
          eventId,
          eventType,
          status: 'processed',
        },
      });
    } catch (err) {
      await this.prisma.webhookEvent.create({
        data: {
          source: SOURCE_CLERK,
          eventId,
          eventType,
          status: 'failed',
        },
      });
      this.logger.error(
        `Clerk webhook processing failed: eventId=${eventId}, error=${err instanceof Error ? err.message : String(err)}`,
      );
      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  private async handleUserCreated(data: Record<string, unknown>): Promise<void> {
    const mapped = mapClerkUserPayload(data as Parameters<typeof mapClerkUserPayload>[0]);
    if (!mapped?.email) {
      this.logger.warn('user.created: missing email, skipping welcome email');
      return;
    }

    // Sync user in DB first
    await this.auth.syncUserFromClerk(mapped.clerkUserId, mapped.email);

    // Enqueue welcome email (async) - falha não derruba o webhook
    try {
      await this.emailProducer.enqueueWelcomeEmail(
        mapped.email,
        { firstName: mapped.firstName ?? undefined },
        {
          clerkUserId: mapped.clerkUserId,
          source: 'clerk',
          externalEventId: undefined,
        },
      );
    } catch (err) {
      this.logger.error(
        `Falha ao enfileirar welcome email: clerkUserId=${mapped.clerkUserId}, error=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async handleUserUpdated(data: Record<string, unknown>): Promise<void> {
    const mapped = mapClerkUserPayload(data as Parameters<typeof mapClerkUserPayload>[0]);
    if (!mapped) return;

    // Sync user in DB
    if (mapped.email) {
      await this.auth.syncUserFromClerk(mapped.clerkUserId, mapped.email);
    }

    // Email verified: send only when user actually verified via email (code/link), NOT when verified via SSO
    const shouldSendEmailVerified =
      mapped.isPrimaryEmailVerified &&
      !mapped.isVerifiedViaSSO &&
      mapped.email;

    if (shouldSendEmailVerified && mapped.email) {
      const alreadySent = await this.prisma.userEmailEvent.findUnique({
        where: {
          userId_type: { userId: mapped.clerkUserId, type: 'email_verified' },
        },
      });

      if (!alreadySent) {
        const dashboardUrl =
          this.config.get<string>('APP_DASHBOARD_URL') ??
          'https://app.maximizeenfermagem.com.br';

        // Enqueue email verified (processor will create UserEmailEvent after send)
        try {
          await this.emailProducer.enqueueEmailVerifiedEmail(
            mapped.email,
            {
              firstName: mapped.firstName ?? undefined,
              dashboardUrl,
            },
            {
              clerkUserId: mapped.clerkUserId,
              source: 'clerk',
              externalEventId: undefined,
            },
          );
        } catch (err) {
          this.logger.error(
            `Falha ao enfileirar email verified: clerkUserId=${mapped.clerkUserId}, error=${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  private async handleUserDeleted(data: Record<string, unknown>): Promise<void> {
    const clerkUserId = data.id as string | undefined;
    if (!clerkUserId) {
      this.logger.warn('user.deleted: missing user id');
      return;
    }

    await this.auth.handleUserDeleted(clerkUserId);
  }
}
