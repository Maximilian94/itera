import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as optionally authenticated: a valid Clerk token populates
 * req.user as usual, but a missing/invalid token lets the request through
 * with req.user undefined instead of a 401. Use for endpoints whose payload
 * is public but enriched for logged-in users (e.g. per-user stats).
 */
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
