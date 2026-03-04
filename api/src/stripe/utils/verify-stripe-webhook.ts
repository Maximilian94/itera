import Stripe from 'stripe';

/**
 * Verifies Stripe webhook signature using the official SDK.
 * The webhook secret comes from Stripe Dashboard > Webhooks > Signing secret.
 *
 * @param stripe - Stripe client instance (used for webhooks.constructEvent).
 * @param rawBody - Raw request body (Buffer). Must not be parsed as JSON.
 * @param signature - Stripe-Signature header value.
 * @param secret - Webhook signing secret (STRIPE_WEBHOOK_SECRET).
 * @returns Parsed Stripe event.
 * @throws Stripe.errors.StripeSignatureVerificationError on verification failure.
 */
export function verifyStripeWebhook(
  stripe: Stripe,
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret) as Stripe.Event;
}
