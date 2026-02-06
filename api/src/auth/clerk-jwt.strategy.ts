import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { AuthService } from './auth.service';

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  private readonly logger = new Logger(ClerkJwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super();
  }

  async validate(req: Request): Promise<{ userId: string; email: string }> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      this.logger.warn('ClerkJwt: no Bearer token in Authorization header');
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      this.logger.error('ClerkJwt: CLERK_SECRET_KEY is not set');
      throw new UnauthorizedException('Clerk is not configured');
    }

    const authorizedPartiesRaw = this.config.get<string>('CLERK_AUTHORIZED_PARTIES');
    const authorizedParties = authorizedPartiesRaw
      ? authorizedPartiesRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await verifyToken(token, {
      secretKey,
      ...(authorizedParties?.length ? { authorizedParties } : {}),
    });

    if (result.error) {
      const err = result.error as { message?: string; code?: string };
      this.logger.warn(
        `ClerkJwt: verifyToken failed: ${err.message ?? String(result.error)} (code: ${err.code ?? 'unknown'})`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Clerk SDK returns { data: payload, error? } or payload-like object. Payload has JWT claims (sub = user id).
    const raw = result as Record<string, unknown>;
    const payload = raw.data ?? raw.payload ?? (raw.sub != null ? raw : null);
    const sub =
      payload && typeof payload === 'object' && 'sub' in payload
        ? (payload as { sub: unknown }).sub
        : undefined;

    if (typeof sub !== 'string') {
      const payloadKeys =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? Object.keys(payload as object).join(', ')
          : 'n/a';
      this.logger.warn(
        `ClerkJwt: no valid payload/sub. result keys: ${Object.keys(result).join(', ')}, payload keys: ${payloadKeys}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    const clerkUserId = sub;
    const clerk = createClerkClient({ secretKey });
    let clerkUser;
    try {
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (err) {
      this.logger.warn(
        `ClerkJwt: Clerk API getUser failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      this.logger.warn('ClerkJwt: user has no email');
      throw new UnauthorizedException('User has no email');
    }

    const user = await this.auth.findOrCreateByClerk(clerkUserId, email);
    return { userId: user.id, email: user.email };
  }
}
