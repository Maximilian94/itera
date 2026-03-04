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

    let payload: { id: string; type: string; data: Record<string, unknown> };
    try {
      payload = await verifyClerkWebhook(rawBody, req.headers, secret);
    } catch (err) {
      this.logger.warn(
        `Clerk webhook verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    if (!payload.id || !payload.type || !payload.data) {
      throw new BadRequestException('Invalid webhook payload');
    }

    await this.clerkWebhookService.processEvent({
      id: payload.id,
      type: payload.type,
      data: payload.data,
    });

    return { received: true };
  }
}
