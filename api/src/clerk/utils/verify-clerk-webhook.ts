import { verifyWebhook } from '@clerk/backend/webhooks';

/**
 * Verifies Clerk webhook signature using @clerk/backend (Svix under the hood).
 * The signing secret comes from Clerk Dashboard > Webhooks > Signing Secret.
 *
 * @param rawBody - Raw request body (Buffer). Must not be parsed as JSON.
 * @param headers - Request headers (svix-id, svix-timestamp, svix-signature required).
 * @param secret - Webhook signing secret (CLERK_WEBHOOK_SIGNING_SECRET).
 * @returns Parsed payload { id, type, data }.
 * @throws On verification failure.
 */
export async function verifyClerkWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): Promise<{ id: string; type: string; data: Record<string, unknown> }> {
  const webRequest = new Request('http://localhost/clerk/webhook', {
    method: 'POST',
    body: new Uint8Array(rawBody),
    headers: headers as HeadersInit,
  });

  const evt = (await verifyWebhook(webRequest, {
    signingSecret: secret,
  })) as unknown as { id: string; type: string; data: Record<string, unknown> };

  return evt;
}
