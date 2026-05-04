import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { ResendWebhookService } from './resend-webhook.service';
import { verifyResendWebhook } from './verify-resend-webhook';

interface RequestWithRawBody {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

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

/**
 * Recebe webhooks do Resend em POST /webhooks/resend.
 * Valida assinatura Svix, registra com idempotência e mapeia para
 * eventos/tags em lead_events / lead_tags.
 */
@Controller('webhooks')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly resendWebhookService: ResendWebhookService,
  ) {}

  @Public()
  @Post('resend')
  async webhook(
    @Req() req: RequestWithRawBody,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification.',
      );
    }

    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('RESEND_WEBHOOK_SECRET is not set');
      throw new BadRequestException('Resend webhook is not configured');
    }

    let payload: Awaited<ReturnType<typeof verifyResendWebhook>>;
    try {
      payload = verifyResendWebhook(rawBody, req.headers, secret);
    } catch (err) {
      this.logger.warn(
        `Resend webhook signature failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    const eventId = getHeader(req.headers, 'svix-id');
    if (!eventId) {
      throw new BadRequestException('Missing svix-id header');
    }
    if (!payload.type) {
      throw new BadRequestException('Invalid webhook payload (missing type)');
    }

    await this.resendWebhookService.process({
      eventId,
      type: payload.type,
      data: payload.data ?? {},
    });

    return { received: true };
  }
}
