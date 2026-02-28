import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Receives webhooks from Clerk when users are created, updated, or deleted.
   * Flow: Clerk sends POST → our server receives in req → we validate signature → we process event.
   *
   * @param req - Express request with rawBody (raw bytes) and original headers
   */
  @Post('webhook')
  @Public()
  async webhook(@Req() req: RequestWithRawBody) {
    /** 1. Ensure we have the raw body: Svix signature is computed over the exact bytes sent. If the body were parsed as JSON, verification would fail. */
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification. Ensure the server is configured to provide rawBody for this route.',
      );
    }

    /** 2. Webhook signing secret (Clerk Dashboard > Webhooks). Used to validate that the request came from Clerk and not an attacker. */
    const signingSecret = this.config.get<string>('CLERK_WEBHOOK_SIGNING_SECRET');
    if (!signingSecret) {
      this.logger.error('CLERK_WEBHOOK_SIGNING_SECRET is not set');
      throw new BadRequestException('Clerk webhook is not configured');
    }

    let evt: { type: string; data: Record<string, unknown> };
    try {
      /**
       * 3. Adapter: verifyWebhook expects a Request (Web API), not Express req.
       * We create a Request object in memory (not an HTTP call) with the same data we received.
       * This lets the library read body and headers in the format it expects.
       */
      const webRequest = new Request('http://localhost/clerk/webhook', {
        method: 'POST',
        body: new Uint8Array(rawBody),
        headers: req.headers as HeadersInit,
      });
      /** 4. Validates the signature and returns the decoded payload. Throws if the signature is invalid. */
      evt = (await verifyWebhook(webRequest, {
        signingSecret,
      })) as unknown as { type: string; data: Record<string, unknown> };
    } catch (err) {
      this.logger.warn(
        `Clerk webhook verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Webhook signature verification failed');
    }

    /** 5. Dispatches the event to the correct handler and syncs with our database. */
    try {
      switch (evt.type) {
        case 'user.created':
        case 'user.updated':
          await this.handleUserSync(evt.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(evt.data);
          break;
        default:
          this.logger.log(`Clerk webhook ignored: ${evt.type}`);
      }
    } catch (err) {
      this.logger.error(
        `Clerk webhook processing failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Webhook processing failed');
    }

    return { received: true };
  }

  /**
   * Extracts the primary email from the Clerk user payload.
   * Supports snake_case (API) and camelCase (SDK).
   */
  private getEmailFromPayload(data: Record<string, unknown>): string | null {
    const emailAddresses = (data.email_addresses ?? data.emailAddresses) as
      | Array<{ id: string; email_address?: string; emailAddress?: string }>
      | undefined;
    const primaryEmailId = (data.primary_email_address_id ?? data.primaryEmailAddressId) as
      | string
      | undefined;

    if (!emailAddresses?.length) return null;
    const primary = primaryEmailId
      ? emailAddresses.find((e) => e.id === primaryEmailId)
      : emailAddresses[0];
    const item = primary ?? emailAddresses[0];
    return item?.email_address ?? item?.emailAddress ?? null;
  }

  /**
   * Creates or updates user in the database from user.created / user.updated.
   * Idempotent for webhook retries.
   */
  private async handleUserSync(data: Record<string, unknown>): Promise<void> {
    const clerkUserId = data.id as string;
    const email = this.getEmailFromPayload(data);

    if (!clerkUserId || !email) {
      this.logger.warn('Clerk webhook: missing clerkUserId or email in payload');
      return;
    }

    await this.auth.syncUserFromClerk(clerkUserId, email);
  }

  /**
   * Sets clerkUserId = null when the user is deleted in Clerk.
   * Does not remove the record; keeps purchase/subscription history for audit.
   */
  private async handleUserDeleted(data: Record<string, unknown>): Promise<void> {
    const clerkUserId = data.id as string | undefined;

    if (!clerkUserId) {
      this.logger.warn('Clerk webhook: missing user id in user.deleted payload');
      return;
    }

    await this.auth.handleUserDeleted(clerkUserId);
  }
}
