import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that verifies whether the authenticated user has an active subscription (status ACTIVE).
 * Users with ADMIN role always pass, regardless of subscription.
 *
 * Use with @UseGuards(AccessGuard) on endpoints that require paid access
 * (e.g. exam creation, training).
 *
 * Returns 403 Forbidden with a message directing the user to subscribe to a plan.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Fetch user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.');
    }

    // Admin always has access
    if (user.role === 'ADMIN') {
      return true;
    }

    // Check if user has active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!activeSubscription) {
      throw new ForbiddenException(
        'Você precisa assinar um plano para acessar este recurso. Acesse /planos para ver as opções.',
      );
    }

    return true;
  }
}
