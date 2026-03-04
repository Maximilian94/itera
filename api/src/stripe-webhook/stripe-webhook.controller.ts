import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { StripeWebhookService } from './stripe-webhook.service';

interface RequestWithRawBody {
  rawBody?: Buffer;
}

/**
 * Receives Stripe webhooks at POST /stripe/webhook.
 * Validates signature, processes payment logic + email dispatch with idempotency.
 */
@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post('webhook')
  @Public()
  async webhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification.',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }

    try {
      await this.stripeWebhookService.processWebhook(rawBody, signature);
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      this.logger.error(
        `Stripe webhook error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Webhook processing failed',
      );
    }

    return { received: true };
  }
}
