import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that allows access when the user has an active subscription OR is in
 * onboarding (no subscription but has at least 1 training session — meaning
 * they already created their 1 free training and are actively using it).
 *
 * Use on endpoints that operate on existing training/attempt data, where free
 * onboarding users must be able to read and interact with their own session.
 *
 * ADMIN users always pass. Ownership per resource is still validated in the
 * service layer via userId.
 */
@Injectable()
export class OnboardingOrAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não encontrado.');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (activeSubscription) {
      return true;
    }

    // Allow onboarding users who already have their 1 free training session
    const trainingCount = await this.prisma.trainingSession.count({
      where: { userId },
    });

    if (trainingCount >= 1) {
      return true;
    }

    throw new ForbiddenException(
      'Você precisa assinar um plano para acessar este recurso. Acesse /planos para ver as opções.',
    );
  }
}
