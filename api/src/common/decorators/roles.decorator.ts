import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Metadata key used by RolesGuard to read the required roles for an endpoint.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator that defines which roles have access to an endpoint.
 * Used together with RolesGuard (registered globally or per controller).
 *
 * @example
 * ```ts
 * @Roles('ADMIN')
 * @Get('admin-only')
 * async adminEndpoint() { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
