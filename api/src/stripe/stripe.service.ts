import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const GATEWAY_STRIPE = 'stripe';
const REFUND_DAYS_CDC = 7;

export type ProductWithPrice = {
  productId: string;
  productName: string;
  description: string | null;
  priceId: string;
  amount: number;
  currency: string;
};

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private productId: string;
  private webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(secretKey);
    const productId = this.config.get<string>('STRIPE_PRODUCT_ID');
    if (!productId) {
      throw new Error('STRIPE_PRODUCT_ID is required');
    }
    this.productId = productId;
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }
    this.webhookSecret = webhookSecret;
  }

  async getProductWithPrice(): Promise<ProductWithPrice> {
    const product = await this.stripe.products.retrieve(this.productId);
    const prices = await this.stripe.prices.list({
      product: this.productId,
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      throw new BadRequestException(
        `No active price found for product ${this.productId}`,
      );
    }
    return {
      productId: product.id,
      productName: product.name,
      description: product.description ?? null,
      priceId: price.id,
      amount: price.unit_amount ?? 0,
      currency: price.currency,
    };
  }

  /**
   * Creates a Stripe Checkout Session for a one-time payment (e.g. 1-year access) and returns
   * the session URL so the client can redirect the user to Stripe's hosted payment page.
   *
   * Flow: validates phone → loads user → gets active price for STRIPE_PRODUCT_ID → gets or
   * creates a Stripe Customer (and persists stripeCustomerId on User) → creates a Checkout
   * Session in payment mode with one line item → returns the session URL. After the user pays,
   * Stripe sends checkout.session.completed to the webhook and we create a Purchase.
   *
   * @param userId – application user id (stored in client_reference_id and metadata)
   * @param successUrl – where Stripe redirects after successful payment
   * @param cancelUrl – where Stripe redirects if the user abandons checkout
   * @returns the Checkout Session URL to redirect the user to
   * @throws BadRequestException if phone is missing, user not found, or Stripe rejects the request
   * @throws InternalServerErrorException on unexpected errors (e.g. DB or network)
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    phone: string | null,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!phone?.trim()) {
      throw new BadRequestException('Telefone é obrigatório para comprar.');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });
      if (!user) {
        throw new BadRequestException('Usuário não encontrado.');
      }

      const { priceId } = await this.getProductWithPrice();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email,
          phone: phone.trim(),
          metadata: { userId },
        });
        customerId = customer.id;
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customer.id },
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        client_reference_id: userId,
        // priceId (Stripe Price), not productId: in Stripe a Product is the sellable item; a Price
        // is a specific amount/currency for that product. Checkout line_items require a Price so
        // Stripe knows how much to charge. One product can have many prices (e.g. one-time vs
        // recurring, or different currencies); we use the active price from getProductWithPrice().
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId },
      });

      if (!session.url) {
        throw new BadRequestException('Falha ao criar sessão de checkout.');
      }
      return { url: session.url };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err && typeof err === 'object' && 'type' in err) {
        const stripeErr = err as { type?: string; message?: string };
        throw new BadRequestException(
          stripeErr.message ?? 'Não foi possível iniciar o checkout. Tente novamente.',
        );
      }
      throw new InternalServerErrorException(
        'Erro ao criar sessão de checkout. Tente novamente em alguns instantes.',
      );
    }
  }

  /**
   * Handles an incoming Stripe webhook: verifies the signature, ensures idempotency, then
   * processes the event. This is the single source of truth for "payment completed" — we do
   * not rely on the client; Stripe calls this endpoint when something happens (e.g. checkout
   * completed).
   *
   * Steps: (1) Verify the request using STRIPE_WEBHOOK_SECRET so only Stripe can trigger
   * this. (2) Skip if we already processed this event (PaymentEvent by gateway + event.id)
   * so retries do not create duplicate Purchases. (3) Persist the event for idempotency.
   * (4) For checkout.session.completed (payment mode): update User.stripeCustomerId, resolve
   * the charge id from the payment intent, and create a Purchase with accessExpiresAt = +1 year.
   *
   * @param rawBody – raw request body (required for signature verification; do not use parsed JSON)
   * @param signature – Stripe-Signature header value
   * @throws BadRequestException if the signature is invalid or verification fails
   */
  async processWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const existing = await this.prisma.paymentEvent.findUnique({
      where: {
        gateway_externalEventId: {
          gateway: GATEWAY_STRIPE,
          externalEventId: event.id,
        },
      },
    });
    if (existing) {
      return;
    }

    await this.prisma.paymentEvent.create({
      data: {
        gateway: GATEWAY_STRIPE,
        externalEventId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'payment') return;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (!userId) return;

      const stripeCustomerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      if (stripeCustomerId) {
        await this.prisma.user.updateMany({
          where: { id: userId },
          data: { stripeCustomerId },
        });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      let stripeChargeId: string | null = null;
      if (paymentIntentId) {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId = pi.latest_charge;
        stripeChargeId =
          typeof chargeId === 'string' ? chargeId : chargeId?.id ?? null;
      }

      const purchasedAt = new Date();
      const accessExpiresAt = new Date(purchasedAt);
      accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);

      await this.prisma.purchase.create({
        data: {
          userId,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? undefined,
          stripeChargeId: stripeChargeId ?? undefined,
          purchasedAt,
          accessExpiresAt,
        },
      });
    }
  }

  async getAccess(userId: string): Promise<{
    hasAccess: boolean;
    status: 'active' | 'trial' | 'inactive';
    accessExpiresAt?: string;
    daysLeft?: number;
    canRequestRefund: boolean;
    lastPurchaseId?: string;
  }> {
    const now = new Date();
    const purchases = await this.prisma.purchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      select: {
        id: true,
        accessExpiresAt: true,
        purchasedAt: true,
        refundedAt: true,
      },
    });

    const activePurchase = purchases.find(
      (p) =>
        !p.refundedAt &&
        p.accessExpiresAt > now,
    );
    if (activePurchase) {
      const daysLeft = Math.ceil(
        (activePurchase.accessExpiresAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const refundDeadline = new Date(activePurchase.purchasedAt);
      refundDeadline.setDate(refundDeadline.getDate() + REFUND_DAYS_CDC);
      const canRequestRefund =
        now <= refundDeadline &&
        !activePurchase.refundedAt &&
        (await this.prisma.refundRequest.count({
          where: {
            purchaseId: activePurchase.id,
            status: 'completed',
          },
        })) === 0;

      return {
        hasAccess: true,
        status: 'active',
        accessExpiresAt: activePurchase.accessExpiresAt.toISOString(),
        daysLeft,
        canRequestRefund,
        lastPurchaseId: activePurchase.id,
      };
    }

    const lastPurchase = purchases[0];
    if (lastPurchase) {
      const refundDeadline = new Date(lastPurchase.purchasedAt);
      refundDeadline.setDate(refundDeadline.getDate() + REFUND_DAYS_CDC);
      const canRequestRefund =
        !lastPurchase.refundedAt &&
        now <= refundDeadline &&
        (await this.prisma.refundRequest.count({
          where: {
            purchaseId: lastPurchase.id,
            status: 'completed',
          },
        })) === 0;

      return {
        hasAccess: false,
        status: 'inactive',
        canRequestRefund,
        lastPurchaseId: lastPurchase.id,
      };
    }

    return {
      hasAccess: false,
      status: 'inactive',
      canRequestRefund: false,
    };
  }

  async requestRefund(userId: string, purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, userId },
      include: { refundRequests: true },
    });
    if (!purchase) {
      throw new BadRequestException('Compra não encontrada.');
    }
    if (purchase.refundedAt) {
      throw new BadRequestException('Esta compra já foi reembolsada.');
    }
    const deadline = new Date(purchase.purchasedAt);
    deadline.setDate(deadline.getDate() + REFUND_DAYS_CDC);
    if (new Date() > deadline) {
      throw new BadRequestException(
        `O prazo para reembolso (${REFUND_DAYS_CDC} dias) já passou.`,
      );
    }
    const hasCompletedRefund = purchase.refundRequests.some(
      (r) => r.status === 'completed',
    );
    if (hasCompletedRefund) {
      throw new BadRequestException('Reembolso já foi solicitado para esta compra.');
    }

    if (!purchase.stripeChargeId) {
      throw new BadRequestException('Charge não encontrado para esta compra.');
    }

    const refund = await this.stripe.refunds.create({
      charge: purchase.stripeChargeId,
      reason: 'requested_by_customer',
    });

    await this.prisma.$transaction([
      this.prisma.purchase.update({
        where: { id: purchaseId },
        data: { refundedAt: new Date() },
      }),
      this.prisma.refundRequest.create({
        data: {
          userId,
          purchaseId,
          stripeRefundId: refund.id,
          status: refund.status === 'succeeded' ? 'completed' : 'pending',
        },
      }),
    ]);
  }
}
