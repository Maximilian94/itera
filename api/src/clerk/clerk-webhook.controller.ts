import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { verifyClerkWebhook } from './utils/verify-clerk-webhook';
import { ClerkWebhookService } from './clerk-webhook.service';

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Receives Clerk webhooks at POST /clerk/webhook.
 * Validates Svix signature, processes events with idempotency, dispatches emails.
 */
@Controller('clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly clerkWebhookService: ClerkWebhookService,
  ) {}

  @Post('webhook')
  @Public()
  async webhook(@Req() req: RequestWithRawBody): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification.',
      );
    }

    const secret = this.config.get<string>('CLERK_WEBHOOK_SIGNING_SECRET');
    if (!secret) {
      this.logger.error('CLERK_WEBHOOK_SIGNING_SECRET is not set');
      throw new BadRequestException('Clerk webhook is not configured');
    }

    let payload: { id?: string; type?: string; data?: Record<string, unknown> };
    try {
      payload = await verifyClerkWebhook(rawBody, req.headers, secret);
    } catch (err) {
      this.logger.warn(
        `Clerk webhook verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    // Idempotency: use payload.id (Svix) or svix-id header. Fallback for edge cases.
    const eventId =
      payload.id ??
      getHeader(req.headers, 'svix-id') ??
      `evt_${String((payload.data as Record<string, unknown>)?.id ?? 'unknown')}`;
    const eventType = payload.type;
    const eventData = payload.data ?? {};

    if (!eventType) {
      this.logger.warn(
        `Invalid webhook payload: missing type. Keys: ${Object.keys(payload).join(', ')}`,
      );
      throw new BadRequestException('Invalid webhook payload');
    }

    await this.clerkWebhookService.processEvent({
      id: eventId,
      type: eventType,
      data: eventData,
    });

    return { received: true };
  }
}
