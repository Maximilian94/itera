import Stripe from 'stripe';

const PLAN_NAME_FALLBACK = 'Assinatura Maximize';

/**
 * Extracts human-readable plan name from Stripe Price/Product.
 * Tries Price → Product.name. Fallback: "Assinatura Maximize".
 */
export async function extractPlanName(
  stripe: Stripe,
  priceId: string | undefined,
): Promise<string> {
  if (!priceId) return PLAN_NAME_FALLBACK;
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const product = price.product as Stripe.Product | undefined;
    const name = product?.name?.trim();
    return name || PLAN_NAME_FALLBACK;
  } catch {
    return PLAN_NAME_FALLBACK;
  }
}

/**
 * Builds the URL for the user to update billing (payment method).
 * Uses Stripe Customer Portal if available; otherwise fallback to app billing page.
 */
export async function extractUpdateBillingUrl(
  stripe: Stripe,
  stripeCustomerId: string | undefined,
  dashboardBillingPath: string,
): Promise<string> {
  if (!stripeCustomerId) return dashboardBillingPath;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: dashboardBillingPath,
    });
    return session.url ?? dashboardBillingPath;
  } catch {
    return dashboardBillingPath;
  }
}
