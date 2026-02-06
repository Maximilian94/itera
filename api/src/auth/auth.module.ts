import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkJwtStrategy } from './clerk-jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PassportModule, PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
