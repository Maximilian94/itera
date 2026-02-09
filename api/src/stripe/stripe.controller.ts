import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

type ReqUser = { user: { userId: string } };

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('product')
  @Public()
  async getProduct() {
    return this.stripe.getProductWithPrice();
  }

  /**
   * Creates a Stripe Checkout Session and returns its URL so the frontend can redirect
   * the user to Stripe's hosted payment page. The user must have a phone number set
   * (required for post-refund contact). After payment, Stripe sends a webhook and we
   * create a Purchase; the user is redirected to successUrl or cancelUrl.
   */
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: ReqUser,
    @Body() body: { successUrl?: string; cancelUrl?: string },
  ) {
    const userId = req.user.userId;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const successUrl = body.successUrl?.trim() || `${frontendUrl}/checkout-success`;
    const cancelUrl = body.cancelUrl?.trim() || `${frontendUrl}/account`;
    return this.stripe.createCheckoutSession(
      userId,
      user.email,
      user.phone,
      successUrl,
      cancelUrl,
    );
  }

  /**
   * Returns the current user's access state: whether they have active access, when it
   * expires, how many days are left, and whether they can request a refund (7-day
   * right of withdrawal). Used by the frontend to show "Active", "Trial", or "Inactive"
   * and to display the correct CTA (e.g. "Buy access" vs "Request refund").
   */
  @Get('access')
  async getAccess(@Req() req: ReqUser) {
    return this.stripe.getAccess(req.user.userId);
  }

  @Post('request-refund')
  async requestRefund(
    @Req() req: ReqUser,
    @Body() body: { purchaseId?: string },
  ) {
    const purchaseId = body?.purchaseId;
    if (!purchaseId || typeof purchaseId !== 'string') {
      throw new BadRequestException('purchaseId é obrigatório.');
    }
    await this.stripe.requestRefund(req.user.userId, purchaseId.trim());
    return { ok: true };
  }
}
