import { createHash } from 'crypto';

/**
 * Helpers de hash SHA256 para o Conversions API do Meta.
 * Política do Meta: PII (email/phone/nome) deve ser enviada hasheada,
 * com normalização específica antes do hash.
 *
 * Refs:
 *  - https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Email: trim + lowercase. */
export function hashEmail(value: string): string {
  return sha256(value.trim().toLowerCase());
}

/**
 * Phone: só dígitos. Inclui country code se possível.
 * Ex: "+55 (11) 9 9999-9999" → "5511999999999".
 */
export function hashPhone(value: string): string {
  return sha256(value.replace(/\D/g, ''));
}

/** Nome (first/last): trim + lowercase, sem acento removido (Meta aceita UTF-8). */
export function hashName(value: string): string {
  return sha256(value.trim().toLowerCase());
}
