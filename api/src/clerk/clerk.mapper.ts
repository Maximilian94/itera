/**
 * Mappers for Clerk webhook payloads.
 * Clerk uses snake_case in API responses; we normalize for internal use.
 *
 * Example payload (user.created / user.updated):
 * {
 *   "id": "user_2abc...",
 *   "email_addresses": [
 *     {
 *       "id": "idn_xxx",
 *       "email_address": "user@example.com",
 *       "verification": { "status": "verified" }
 *     }
 *   ],
 *   "primary_email_address_id": "idn_xxx",
 *   "first_name": "Maria",
 *   "last_name": "Silva"
 * }
 */

export interface ClerkUserPayload {
  id?: string;
  email_addresses?: Array<{
    id: string;
    email_address?: string;
    emailAddress?: string;
    verification?: { status?: string; strategy?: string };
  }>;
  emailAddresses?: ClerkUserPayload['email_addresses'];
  primary_email_address_id?: string;
  primaryEmailAddressId?: string;
  external_accounts?: unknown[];
  externalAccounts?: unknown[];
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
}

export interface MappedClerkUser {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  isPrimaryEmailVerified: boolean;
  /** True when email was verified via OAuth/SSO (from_oauth_*). We should NOT send "email verified" in that case. */
  isVerifiedViaSSO: boolean;
}

/**
 * Extracts primary email, firstName, and verification status from Clerk user payload.
 */
export function mapClerkUserPayload(data: ClerkUserPayload): MappedClerkUser | null {
  const clerkUserId = data.id ?? (data as Record<string, unknown>).id;
  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return null;
  }

  const emailAddresses =
    data.email_addresses ?? data.emailAddresses ?? [];
  const primaryEmailId =
    data.primary_email_address_id ?? data.primaryEmailAddressId;

  const primaryEmail = primaryEmailId
    ? emailAddresses.find((e) => e.id === primaryEmailId)
    : emailAddresses[0];

  const email =
    primaryEmail?.email_address ?? primaryEmail?.emailAddress ?? null;

  const firstName =
    (data.first_name ?? data.firstName) as string | undefined ?? null;

  const verificationStatus =
    primaryEmail?.verification?.status ?? 'unverified';
  const verificationStrategy =
    primaryEmail?.verification?.strategy ?? '';
  const isPrimaryEmailVerified = verificationStatus === 'verified';
  const externalAccounts =
    (data.external_accounts ?? data.externalAccounts) as unknown[] | undefined;
  const hasExternalAccounts = (externalAccounts?.length ?? 0) > 0;
  // from_oauth, from_oauth_google, etc. = email came from OAuth provider
  // Also treat as SSO when user has OAuth accounts (signed up with Google, etc.)
  const isVerifiedViaSSO =
    isPrimaryEmailVerified &&
    (verificationStrategy.startsWith('from_oauth') ||
      verificationStrategy === 'oauth' ||
      hasExternalAccounts);

  return {
    clerkUserId,
    email,
    firstName: firstName ?? null,
    isPrimaryEmailVerified,
    isVerifiedViaSSO,
  };
}
