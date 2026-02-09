import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { StripeService } from './stripe.service';

interface RequestWithRawBody {
  rawBody?: Buffer;
}

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Post('webhook')
  @Public()
  async webhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body is required for webhook signature verification. Ensure the server is configured to provide rawBody for this route.',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }
    try {
      await this.stripe.processWebhookEvent(rawBody, signature);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Webhook processing failed',
      );
    }
    return { received: true };
  }
}
