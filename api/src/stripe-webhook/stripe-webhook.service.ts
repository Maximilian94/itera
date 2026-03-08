import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { EmailProducerService } from '../email/email.producer';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractPlanName,
  extractUpdateBillingUrl,
} from '../stripe/stripe-webhook.mapper';
import { StripeService } from '../stripe/stripe.service';
import { verifyStripeWebhook } from '../stripe/utils/verify-stripe-webhook';

const SOURCE_STRIPE = 'stripe';

/**
 * Processes Stripe webhook events for email dispatch.
 * Uses WebhookEvent table for idempotency. Delegates payment logic to StripeService.
 */
@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducerService,
    private readonly stripeService: StripeService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(secretKey);
  }

  /**
   * Main entry: verify signature, run payment logic, dispatch emails with idempotency.
   */
  async processWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not set');
      throw new BadRequestException('Stripe webhook is not configured');
    }

    let event: Stripe.Event;
    try {
      event = verifyStripeWebhook(
        this.stripe,
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.warn(
        `Stripe webhook verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    // 1. Payment logic (subscription, purchase, etc.)
    await this.stripeService.processWebhookEvent(rawBody, signature);

    // 2. Email dispatch for supported events (with WebhookEvent idempotency)
    await this.dispatchEmailsForEvent(event);
  }

  private async dispatchEmailsForEvent(event: Stripe.Event): Promise<void> {
    const eventId = event.id;
    const eventType = event.type;

    if (
      eventType !== 'checkout.session.completed' &&
      eventType !== 'invoice.payment_failed' &&
      eventType !== 'customer.subscription.deleted'
    ) {
      return;
    }

    // Idempotency: skip if already processed
    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        source_eventId: { source: SOURCE_STRIPE, eventId },
      },
    });

    if (existing) {
      this.logger.log(
        `Stripe webhook already processed: eventId=${eventId}, status=${existing.status}`,
      );
      return;
    }

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompletedEmail(event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailedEmail(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeletedEmail(event);
          break;
      }

      await this.prisma.webhookEvent.create({
        data: {
          source: SOURCE_STRIPE,
          eventId,
          eventType,
          status: 'processed',
        },
      });
    } catch (err) {
      await this.prisma.webhookEvent.create({
        data: {
          source: SOURCE_STRIPE,
          eventId,
          eventType,
          status: 'failed',
        },
      });
      this.logger.error(
        `Stripe webhook email dispatch failed: eventId=${eventId}, error=${err instanceof Error ? err.message : String(err)}`,
      );
      // Do not rethrow - return 200 so Stripe does not retry indefinitely
    }
  }

  private async handleCheckoutCompletedEmail(
    event: Stripe.Event,
  ): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') return;

    const stripeCustomerId = this.getCustomerId(session.customer);
    const user = await this.findUserByStripeCustomerId(stripeCustomerId);
    if (!user) return;

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!stripeSubscriptionId) return;

    let priceId: string | undefined;
    try {
      const sub = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId,
      );
      priceId = sub.items.data[0]?.price.id;
    } catch {
      // ignore
    }

    const planName = await extractPlanName(this.stripe, priceId);
    await this.emailProducer.enqueueSubscriptionActivatedEmail(
      user.email,
      { planName },
      {
        subscriptionId: stripeSubscriptionId,
        source: 'stripe',
        externalEventId: event.id,
      },
    );
  }

  private async handleInvoicePaymentFailedEmail(
    event: Stripe.Event,
  ): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId = this.getCustomerId(invoice.customer);
    const user = await this.findUserByStripeCustomerId(stripeCustomerId);
    if (!user) return;

    const dashboardUrl =
      this.config.get<string>('APP_DASHBOARD_URL') ??
      'https://app.maximizeenfermagem.com.br';
    const billingPath = `${dashboardUrl}/billing`;
    const updateBillingUrl = await extractUpdateBillingUrl(
      this.stripe,
      stripeCustomerId ?? undefined,
      billingPath,
    );

    await this.emailProducer.enqueuePaymentFailedEmail(
      user.email,
      { updateBillingUrl },
      {
        invoiceId: invoice.id,
        source: 'stripe',
        externalEventId: event.id,
      },
    );
  }

  private async handleSubscriptionDeletedEmail(
    event: Stripe.Event,
  ): Promise<void> {
    const sub = event.data.object as Stripe.Subscription;
    const stripeCustomerId = this.getCustomerId(sub.customer);
    const user = await this.findUserByStripeCustomerId(stripeCustomerId);
    if (!user) return;

    const priceId = sub.items.data[0]?.price.id;
    const planName = await extractPlanName(this.stripe, priceId);

    await this.emailProducer.enqueueSubscriptionCanceledEmail(
      user.email,
      { planName },
      {
        subscriptionId: sub.id,
        source: 'stripe',
        externalEventId: event.id,
      },
    );
  }

  private getCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ): string | null {
    if (!customer) return null;
    if (typeof customer === 'string') return customer;
    return customer.id ?? null;
  }

  private async findUserByStripeCustomerId(
    stripeCustomerId: string | null,
  ): Promise<{ email: string } | null> {
    if (!stripeCustomerId) {
      this.logger.warn('Stripe event: missing stripeCustomerId');
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId },
      select: { email: true },
    });

    if (!user) {
      this.logger.warn(
        `Stripe event: user not found for stripeCustomerId=${stripeCustomerId}`,
      );
      return null;
    }

    return user;
  }
}
