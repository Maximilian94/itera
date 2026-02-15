import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

type ReqUser = { user: { userId: string } };

/**
 * Controller for Stripe subscription endpoints:
 * available plans, checkout, customer portal, access and refund.
 */
@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns the 3 available plans with monthly/yearly prices, features and limits.
   * Used by the plans page on the frontend to display subscription options.
   */
  @Get('plans')
  async getPlans() {
    return this.stripe.getPlans();
  }

  /**
   * Creates a Stripe Checkout session for recurring subscription.
   * The frontend redirects the user to the returned URL.
   *
   * @param body.priceId – Stripe price ID (price_xxx) chosen by the user
   * @param body.successUrl – Redirect URL after payment (optional)
   * @param body.cancelUrl – Redirect URL if user abandons (optional)
   */
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: ReqUser,
    @Body() body: { priceId: string; successUrl?: string; cancelUrl?: string },
  ) {
    const userId = req.user.userId;
    if (!body.priceId || typeof body.priceId !== 'string') {
      throw new BadRequestException('priceId é obrigatório.');
    }

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
    const cancelUrl = body.cancelUrl?.trim() || `${frontendUrl}/planos`;

    return this.stripe.createCheckoutSession(
      userId,
      user.email,
      user.phone,
      body.priceId.trim(),
      successUrl,
      cancelUrl,
    );
  }

  /**
   * Creates a Stripe Customer Portal session for the user to manage
   * their subscription (change plan, cancel, update payment method).
   *
   * @param body.returnUrl – URL where Stripe redirects when leaving the portal (optional)
   */
  @Post('customer-portal')
  async createCustomerPortal(
    @Req() req: ReqUser,
    @Body() body: { returnUrl?: string },
  ) {
    const userId = req.user.userId;
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const returnUrl = body.returnUrl?.trim() || `${frontendUrl}/account`;

    return this.stripe.createCustomerPortalSession(userId, returnUrl);
  }

  /**
   * Retorna o estado de acesso do usuário: plano ativo, status (active/trial/inactive),
   * limites de treinos, e se pode solicitar reembolso (CDC 7 dias).
   */
  @Get('access')
  async getAccess(@Req() req: ReqUser) {
    return this.stripe.getAccess(req.user.userId);
  }

  /**
   * Solicita reembolso de um pagamento específico (direito de arrependimento CDC 7 dias).
   * Cancela a assinatura e reembolsa o valor pago.
   *
   * @param body.purchaseId – ID do Purchase a ser reembolsado
   */
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
