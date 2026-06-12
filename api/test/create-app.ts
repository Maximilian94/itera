import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { ConcursoModule } from '../src/concurso/concurso.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { IS_OPTIONAL_AUTH_KEY } from '../src/common/decorators/optional-auth.decorator';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';

/** Header que os testes usam para "logar" como um usuário seedado. */
export const TEST_USER_HEADER = 'x-test-user-id';

/**
 * Substitui o ClerkJwtAuthGuard global preservando a semântica que os
 * endpoints enxergam em produção:
 *
 * - `@Public()`            → passa sempre;
 * - header presente        → req.user = { userId } (o id vem do seed);
 * - `@OptionalAuth()`      → sem header passa anônimo (req.user undefined);
 * - rota comum sem header  → 401.
 *
 * Os testes não exercitam a verificação de token do Clerk (rede externa) —
 * exercitam tudo que vem depois dela.
 */
@Injectable()
class TestAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { userId: string } }>();
    const userId = req.headers[TEST_USER_HEADER];
    if (typeof userId === 'string' && userId.length > 0) {
      req.user = { userId };
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional) return true;
    throw new UnauthorizedException();
  }
}

/**
 * App e2e enxuto: só os módulos sob teste (Prisma é @Global) — sem Redis,
 * Clerk, Stripe etc. Novos módulos de endpoint entram em `imports` conforme
 * ganharem cobertura e2e.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [PrismaModule, ConcursoModule],
    providers: [{ provide: APP_GUARD, useClass: TestAuthGuard }],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
