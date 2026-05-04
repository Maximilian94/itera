import { Webhook } from 'svix';

/**
 * Verifica assinatura Svix do webhook Resend (mesmo protocolo do Clerk).
 *
 * Headers esperados: svix-id, svix-timestamp, svix-signature.
 * `secret` vem do painel Resend (RESEND_WEBHOOK_SECRET — começa com `whsec_`).
 *
 * Lança erro se a assinatura for inválida.
 */
export interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data: Record<string, unknown>;
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

export function verifyResendWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): ResendWebhookPayload {
  const svixId = getHeader(headers, 'svix-id');
  const svixTimestamp = getHeader(headers, 'svix-timestamp');
  const svixSignature = getHeader(headers, 'svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix headers (svix-id, svix-timestamp, svix-signature)');
  }

  const wh = new Webhook(secret);
  const payload = wh.verify(rawBody.toString('utf8'), {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  }) as ResendWebhookPayload;

  return payload;
}
