import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

/** Gateway identifier for webhook idempotency (PaymentEvent table). */
const GATEWAY_STRIPE = 'stripe';

/** Deadline in days to request a refund (right of withdrawal — Brazilian CDC Art. 49). */
const REFUND_DAYS_CDC = 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Monthly training limit per plan. */
const TRAINING_LIMITS: Record<SubscriptionPlan, number> = {
  ESSENCIAL: 0,
  ESTRATEGICO: 5,
  ELITE: 20,
};

/** Configuration mapping a Stripe price ID to plan + billing interval. */
interface PriceConfig {
  priceId: string;
  plan: SubscriptionPlan;
  interval: 'month' | 'year';
}

/** Response for the GET /stripe/plans endpoint. */
export type PlanInfo = {
  plan: SubscriptionPlan;
  /** Human-readable plan name. */
  name: string;
  /** Short plan description. */
  description: string;
  /** List of plan features for display. */
  features: string[];
  /** Monthly price in cents. */
  monthlyAmount: number;
  /** Yearly price in cents. */
  yearlyAmount: number;
  /** ISO 4217 currency (e.g. "brl"). */
  currency: string;
  /** Stripe price ID for monthly billing. */
  monthlyPriceId: string;
  /** Stripe price ID for yearly billing. */
  yearlyPriceId: string;
  /** Smart training limit per month (0 = not available). */
  trainingLimit: number;
};

/** Response for the GET /stripe/access endpoint. */
export type AccessResponse = {
  hasAccess: boolean;
  status: 'active' | 'trial' | 'inactive';
  plan?: SubscriptionPlan;
  /** Current billing interval when active/trial. */
  billingInterval?: 'month' | 'year';
  /** Current Stripe price ID when active/trial. */
  stripePriceId?: string;
  currentPeriodEnd?: string;
  /** Plan that will take effect at next billing (downgrade scheduled). */
  scheduledPlan?: SubscriptionPlan;
  /** ISO date when the scheduled change takes effect. */
  scheduledChangeDate?: string;
  /** Billing interval that will take effect (for interval change: annual->monthly). */
  scheduledInterval?: 'month' | 'year';
  canRequestRefund: boolean;
  lastPurchaseId?: string;
  trainingLimit?: number;
  trainingsUsedThisMonth?: number;
  /** When inactive: true if user has 0 trainings and can do 1 free onboarding training. */
  canDoFreeTraining?: boolean;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service responsible for all Stripe integration: plans, subscription checkout,
 * webhook processing, access queries, and refunds.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private webhookSecret: string;

  /** Mapping of price ID → { plan, interval }. Built from .env configuration. */
  private priceConfigMap: Map<string, PriceConfig> = new Map();

  /** Static plan metadata (name, description, features). */
  private static readonly PLAN_META: Record<
    SubscriptionPlan,
    { name: string; description: string; features: string[] }
  > = {
    ESSENCIAL: {
      name: 'Essencial',
      description: 'O básico para começar a estudar com provas reais.',
      features: [
        'Provas ilimitadas',
        'Explicações em todas as alternativas',
        'Acesso a todo histórico de provas',
      ],
    },
    ESTRATEGICO: {
      name: 'Estratégico',
      description: 'Estude de forma inteligente com treinos guiados por IA.',
      features: [
        'Tudo do Essencial',
        'Até 5 treinos inteligentes/mês',
        'Diagnóstico personalizado da prova',
        'Plano de estudo personalizado',
        'Exercícios focados nos seus erros',
      ],
    },
    ELITE: {
      name: 'Elite',
      description: 'Para quem quer o máximo de preparação.',
      features: [
        'Tudo do Estratégico',
        'Até 20 treinos inteligentes/mês',
      ],
    },
  };

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is required');
    this.stripe = new Stripe(secretKey);

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
    this.webhookSecret = webhookSecret;

    this.loadPriceConfig();
  }

  // ---------------------------------------------------------------------------
  // Initialization helpers
  // ---------------------------------------------------------------------------

  /**
   * Loads the 6 price IDs from .env and builds the priceId → { plan, interval } map.
   * If a price ID is not configured, logs a warning but does not throw
   * (allows starting the server without full Stripe config in dev).
   */
  private loadPriceConfig(): void {
    const pairs: Array<{
      envKey: string;
      plan: SubscriptionPlan;
      interval: 'month' | 'year';
    }> = [
      { envKey: 'STRIPE_PRICE_ESSENCIAL_MONTHLY', plan: 'ESSENCIAL', interval: 'month' },
      { envKey: 'STRIPE_PRICE_ESSENCIAL_YEARLY', plan: 'ESSENCIAL', interval: 'year' },
      { envKey: 'STRIPE_PRICE_ESTRATEGICO_MONTHLY', plan: 'ESTRATEGICO', interval: 'month' },
      { envKey: 'STRIPE_PRICE_ESTRATEGICO_YEARLY', plan: 'ESTRATEGICO', interval: 'year' },
      { envKey: 'STRIPE_PRICE_ELITE_MONTHLY', plan: 'ELITE', interval: 'month' },
      { envKey: 'STRIPE_PRICE_ELITE_YEARLY', plan: 'ELITE', interval: 'year' },
    ];

    for (const { envKey, plan, interval } of pairs) {
      const priceId = this.config.get<string>(envKey);
      if (priceId && priceId !== 'price_...') {
        this.priceConfigMap.set(priceId, { priceId, plan, interval });
      } else {
        this.logger.warn(`${envKey} não configurado — plano ${plan} (${interval}) indisponível.`);
      }
    }
  }

  /**
   * Resolves the SubscriptionPlan from a Stripe price ID.
   * @throws BadRequestException if the priceId is not mapped.
   */
  private resolvePlanFromPriceId(priceId: string): PriceConfig {
    const config = this.priceConfigMap.get(priceId);
    if (!config) {
      throw new BadRequestException(`Price ID desconhecido: ${priceId}`);
    }
    return config;
  }

  // ---------------------------------------------------------------------------
  // GET /stripe/plans — list plans with prices
  // ---------------------------------------------------------------------------

  /**
   * Returns the 3 plans with monthly/yearly prices fetched from Stripe.
   * Prices are fetched in real-time via Stripe API to ensure they reflect
   * current dashboard values.
   */
  async getPlans(): Promise<PlanInfo[]> {
    const plans: PlanInfo[] = [];

    for (const plan of ['ESSENCIAL', 'ESTRATEGICO', 'ELITE'] as SubscriptionPlan[]) {
      const meta = StripeService.PLAN_META[plan];
      let monthlyPriceId = '';
      let yearlyPriceId = '';
      let monthlyAmount = 0;
      let yearlyAmount = 0;
      let currency = 'brl';

      for (const [pid, cfg] of this.priceConfigMap.entries()) {
        if (cfg.plan === plan) {
          if (cfg.interval === 'month') monthlyPriceId = pid;
          if (cfg.interval === 'year') yearlyPriceId = pid;
        }
      }

      // Fetch real-time prices from Stripe
      try {
        if (monthlyPriceId) {
          const p = await this.stripe.prices.retrieve(monthlyPriceId);
          monthlyAmount = p.unit_amount ?? 0;
          currency = p.currency;
        }
        if (yearlyPriceId) {
          const p = await this.stripe.prices.retrieve(yearlyPriceId);
          yearlyAmount = p.unit_amount ?? 0;
        }
      } catch (err) {
        this.logger.warn(`Falha ao buscar preços do Stripe para ${plan}: ${err}`);
      }

      plans.push({
        plan,
        name: meta.name,
        description: meta.description,
        features: meta.features,
        monthlyAmount,
        yearlyAmount,
        currency,
        monthlyPriceId,
        yearlyPriceId,
        trainingLimit: TRAINING_LIMITS[plan],
      });
    }

    return plans;
  }

  // ---------------------------------------------------------------------------
  // POST /stripe/checkout-session — create checkout session for subscription
  // ---------------------------------------------------------------------------

  /**
   * Creates a Stripe Checkout session for recurring subscription.
   *
   * Flow: validate phone → load user → get or create Stripe Customer →
   * create Checkout Session with mode: 'subscription' → return URL.
   *
   * After payment, Stripe sends webhook checkout.session.completed and
   * we create the Subscription in the database.
   *
   * @param userId – User ID in the application
   * @param email – User email (for creating Customer in Stripe)
   * @param phone – Phone (required for post-refund contact)
   * @param priceId – Stripe price ID (price_xxx) chosen by the user
   * @param successUrl – Redirect URL after successful payment
   * @param cancelUrl – Redirect URL if user abandons checkout
   * @returns Stripe checkout session URL
   * @throws BadRequestException if phone missing, invalid priceId, or Stripe rejects
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    phone: string | null,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!phone?.trim()) {
      throw new BadRequestException('Telefone é obrigatório para assinar.');
    }

    // Validate the priceId is in our mapping
    this.resolvePlanFromPriceId(priceId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });
      if (!user) {
        throw new BadRequestException('Usuário não encontrado.');
      }

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
        mode: 'subscription',
        customer: customerId,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: 'pt-BR',
        metadata: { userId },
        subscription_data: {
          metadata: { userId },
        },
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

  // ---------------------------------------------------------------------------
  // POST /stripe/customer-portal — Stripe customer portal
  // ---------------------------------------------------------------------------

  /**
   * Creates a Stripe Customer Portal session so the user can manage
   * their subscription (change plan, cancel, update card).
   *
   * @param userId – User ID in the application
   * @param returnUrl – URL where Stripe redirects when leaving the portal
   * @returns Customer Portal URL
   * @throws BadRequestException if user does not have stripeCustomerId
   */
  async createCustomerPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new BadRequestException(
        'Nenhuma assinatura encontrada. Assine um plano primeiro.',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  /**
   * Processes Stripe webhook events. Verifies signature, ensures idempotency
   * via PaymentEvent, and dispatches to the correct handler.
   *
   * Handled events:
   * - checkout.session.completed (mode=subscription) → creates Subscription
   * - customer.subscription.updated → updates status, plan, period
   * - customer.subscription.deleted → marks as CANCELED
   * - invoice.payment_succeeded → creates Purchase (audit trail)
   * - invoice.payment_failed → marks Subscription as PAST_DUE
   * - charge.refunded → marks Purchase.refundedAt
   *
   * @param rawBody – Raw request body (required for signature verification)
   * @param signature – Stripe-Signature header value
   * @throws BadRequestException if signature verification fails
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

    // Idempotency: skip if we already processed this event
    const existing = await this.prisma.paymentEvent.findUnique({
      where: {
        gateway_externalEventId: {
          gateway: GATEWAY_STRIPE,
          externalEventId: event.id,
        },
      },
    });
    if (existing) return;

    await this.prisma.paymentEvent.create({
      data: {
        gateway: GATEWAY_STRIPE,
        externalEventId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;
      default:
        this.logger.log(`Webhook ignorado: ${event.type}`);
    }
  }

  /**
   * Handles checkout.session.completed (mode=subscription):
   * Creates the Subscription in the database and updates User.stripeCustomerId.
   */
  private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') return;

    const userId = session.client_reference_id ?? session.metadata?.userId;
    if (!userId) {
      this.logger.warn('checkout.session.completed sem userId');
      return;
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!stripeSubscriptionId) {
      this.logger.warn('checkout.session.completed sem subscription ID');
      return;
    }

    // Update stripeCustomerId on User
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

    // Fetch subscription details from Stripe
    const sub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const stripePriceId = sub.items.data[0]?.price.id;
    if (!stripePriceId) {
      this.logger.warn('Subscription sem price ID');
      return;
    }

    const priceConfig = this.priceConfigMap.get(stripePriceId);
    const plan = priceConfig?.plan ?? 'ESSENCIAL';

    // Plan change via Checkout: cancel old subscription.
    // Per rules A–E: upgrades get proration (credit); downgrades do not.
    if (session.metadata?.planChange === 'true') {
      const isUpgrade = session.metadata?.isUpgrade === 'true';
      const oldSubs = await this.prisma.subscription.findMany({
        where: {
          userId,
          stripeSubscriptionId: { not: stripeSubscriptionId },
          status: 'ACTIVE',
        },
      });
      for (const old of oldSubs) {
        try {
          await this.stripe.subscriptions.cancel(old.stripeSubscriptionId, {
            ...(isUpgrade ? { prorate: true, invoice_now: true } : {}),
          });
        } catch (err) {
          this.logger.warn(
            `Falha ao cancelar assinatura antiga ${old.stripeSubscriptionId}: ${err}`,
          );
        }
      }
    }

    // Create or update Subscription in database
    const subscriptionData = {
      stripePriceId,
      plan,
      status: this.mapStripeStatus(sub.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      ...(session.metadata?.planChange === 'true'
        ? { stripeScheduleId: null, scheduledPlan: null, scheduledPriceId: null }
        : {}),
    };
    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId },
      create: {
        userId,
        stripeSubscriptionId,
        stripeCustomerId: stripeCustomerId ?? '',
        ...subscriptionData,
      },
      update: subscriptionData,
    });
  }

  /**
   * Handles customer.subscription.updated: syncs status, plan and period.
   * Clears scheduled downgrade fields when the new plan/price has taken effect
   * (schedule phase transition) or when the subscription no longer has a schedule.
   */
  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const sub = event.data.object as Stripe.Subscription;
    const stripePriceId = sub.items.data[0]?.price.id;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    if (!existing) {
      this.logger.warn(`subscription.updated para sub desconhecida: ${sub.id}`);
      return;
    }

    const priceConfig = stripePriceId
      ? this.priceConfigMap.get(stripePriceId)
      : null;
    const newPlan = priceConfig?.plan ?? existing.plan;

    const downgradeTookEffect =
      existing.scheduledPlan &&
      existing.scheduledPriceId &&
      stripePriceId === existing.scheduledPriceId;
    const noLongerHasSchedule = !sub.schedule;

    const clearScheduled = downgradeTookEffect || noLongerHasSchedule;

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        stripePriceId: stripePriceId ?? existing.stripePriceId,
        plan: newPlan,
        status: this.mapStripeStatus(sub.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        ...(clearScheduled
          ? {
              stripeScheduleId: null,
              scheduledPlan: null,
              scheduledPriceId: null,
            }
          : {}),
      },
    });
  }

  /**
   * Handles customer.subscription.deleted: marks the subscription as CANCELED.
   */
  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const sub = event.data.object as Stripe.Subscription;

    await this.prisma.subscription
      .update({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELED' },
      })
      .catch((err) => {
        this.logger.warn(`subscription.deleted para sub desconhecida: ${sub.id} — ${err}`);
      });
  }

  /**
   * Handles invoice.payment_succeeded: creates a Purchase (payment record) linked
   * to the Subscription. Each monthly/yearly charge generates a Purchase for audit trail.
   */
  private async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.subscription) return;

    const stripeSubscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      select: { id: true, userId: true },
    });
    if (!subscription) {
      this.logger.warn(`invoice.payment_succeeded para sub desconhecida: ${stripeSubscriptionId}`);
      return;
    }

    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id ?? null;

    let stripeChargeId: string | null = null;
    if (paymentIntentId) {
      try {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId = pi.latest_charge;
        stripeChargeId =
          typeof chargeId === 'string' ? chargeId : chargeId?.id ?? null;
      } catch {
        this.logger.warn(`Falha ao buscar charge para PI ${paymentIntentId}`);
      }
    }

    // Skip duplicate if we already have a Purchase with this invoiceId
    if (invoice.id) {
      const existingPurchase = await this.prisma.purchase.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });
      if (existingPurchase) return;
    }

    await this.prisma.purchase.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id ?? undefined,
        stripePaymentIntentId: paymentIntentId ?? undefined,
        stripeChargeId: stripeChargeId ?? undefined,
        amount: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? 'brl',
      },
    });
  }

  /**
   * Handles invoice.payment_failed: marks the Subscription as PAST_DUE.
   */
  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.subscription) return;

    const stripeSubscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;

    await this.prisma.subscription
      .update({
        where: { stripeSubscriptionId },
        data: { status: 'PAST_DUE' },
      })
      .catch((err) => {
        this.logger.warn(`invoice.payment_failed para sub desconhecida: ${stripeSubscriptionId} — ${err}`);
      });
  }

  /**
   * Handles charge.refunded: marks Purchase.refundedAt for the corresponding charge.
   */
  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    await this.prisma.purchase
      .updateMany({
        where: { stripeChargeId: charge.id, refundedAt: null },
        data: { refundedAt: new Date() },
      })
      .catch((err) => {
        this.logger.warn(`charge.refunded para charge desconhecido: ${charge.id} — ${err}`);
      });
  }

  /**
   * Maps Stripe subscription status to the application's SubscriptionStatus enum.
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
      case 'unpaid':
        return 'CANCELED';
      default:
        return 'INCOMPLETE';
    }
  }

  // ---------------------------------------------------------------------------
  // GET /stripe/access — user access state
  // ---------------------------------------------------------------------------

  /**
   * Returns the user's access state: whether they have an active subscription, which plan,
   * if they're in trial (7-day CDC), how many trainings used this month and the limit.
   *
   * Logic:
   * - Fetches the user's most recent ACTIVE subscription.
   * - If it exists and was created less than 7 days ago → status = 'trial' (CDC withdrawal right).
   * - If it exists → status = 'active'.
   * - Otherwise → status = 'inactive'.
   * - Counts TrainingSessions in current month to verify training limit.
   *
   * @param userId – User ID in the application
   * @returns complete access state for the frontend
   */
  async getAccess(userId: string): Promise<AccessResponse> {
    const now = new Date();

    // Find active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        purchases: {
          where: { refundedAt: null },
          orderBy: { purchasedAt: 'desc' },
          take: 1,
          select: { id: true, purchasedAt: true },
        },
      },
    });

    if (!activeSubscription) {
      const totalTrainings = await this.prisma.trainingSession.count({
        where: { userId },
      });
      return {
        hasAccess: false,
        status: 'inactive',
        canRequestRefund: false,
        canDoFreeTraining: totalTrainings === 0,
      };
    }

    // Check if within trial period (CDC 7-day withdrawal)
    const firstPurchase = activeSubscription.purchases[0];
    const isTrialPeriod =
      firstPurchase &&
      now.getTime() - firstPurchase.purchasedAt.getTime() <
        REFUND_DAYS_CDC * 24 * 60 * 60 * 1000;

    // Check if refund can be requested
    let canRequestRefund = false;
    if (firstPurchase && isTrialPeriod) {
      const completedRefunds = await this.prisma.refundRequest.count({
        where: { purchaseId: firstPurchase.id, status: 'completed' },
      });
      canRequestRefund = completedRefunds === 0;
    }

    // Count training sessions in current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const trainingsUsedThisMonth = await this.prisma.trainingSession.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    const trainingLimit = TRAINING_LIMITS[activeSubscription.plan];
    const priceConfig = activeSubscription.stripePriceId
      ? this.priceConfigMap.get(activeSubscription.stripePriceId)
      : null;
    const scheduledPriceConfig = activeSubscription.scheduledPriceId
      ? this.priceConfigMap.get(activeSubscription.scheduledPriceId)
      : null;

    return {
      hasAccess: true,
      status: isTrialPeriod ? 'trial' : 'active',
      plan: activeSubscription.plan,
      billingInterval: priceConfig?.interval ?? undefined,
      stripePriceId: activeSubscription.stripePriceId ?? undefined,
      currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
      scheduledPlan: activeSubscription.scheduledPlan ?? undefined,
      scheduledChangeDate: activeSubscription.scheduledPlan
        ? activeSubscription.currentPeriodEnd.toISOString()
        : undefined,
      scheduledInterval: scheduledPriceConfig?.interval ?? undefined,
      canRequestRefund,
      lastPurchaseId: firstPurchase?.id,
      trainingLimit,
      trainingsUsedThisMonth,
    };
  }

  // ---------------------------------------------------------------------------
  // POST /stripe/request-refund — CDC 7-day refund
  // ---------------------------------------------------------------------------

  /**
   * Requests refund for a specific payment (CDC 7-day withdrawal right).
   * Cancels the subscription in Stripe and creates the refund.
   *
   * @param userId – User ID
   * @param purchaseId – ID of the Purchase to be refunded
   * @throws BadRequestException if past deadline, already refunded, or charge not found
   */
  async requestRefund(userId: string, purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, userId },
      include: { refundRequests: true, subscription: true },
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

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      charge: purchase.stripeChargeId,
      reason: 'requested_by_customer',
    });

    // Cancel subscription in Stripe (immediately)
    if (purchase.subscription?.stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(
          purchase.subscription.stripeSubscriptionId,
        );
      } catch (err) {
        this.logger.warn(
          `Falha ao cancelar subscription ${purchase.subscription.stripeSubscriptionId}: ${err}`,
        );
      }
    }

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
      // Mark subscription as cancelled
      ...(purchase.subscriptionId
        ? [
            this.prisma.subscription.update({
              where: { id: purchase.subscriptionId },
              data: { status: 'CANCELED' },
            }),
          ]
        : []),
    ]);
  }
}
