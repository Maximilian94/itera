import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClerkJwtAuthGuard } from './auth/clerk-jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { SkillsModule } from './skills/skills.module';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ExamsModule } from './exams/exams.module';
import { ExamBoardModule } from './examBoard/exam-board.module';
import { ExamBaseModule } from './examBase/exam-base.module';
import { ExamBaseQuestionModule } from './examBaseQuestion/exam-base-question.module';
import { ExamBaseAttemptModule } from './examBaseAttempt/exam-base-attempt.module';
import { TrainingModule } from './training/training.module';
import { StorageModule } from './storage/storage.module';
import { StripeModule } from './stripe/stripe.module';
import { ClerkModule } from './clerk/clerk.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    SkillsModule,
    QuestionsModule,
    AttemptsModule,
    ExamsModule,
    ExamBoardModule,
    ExamBaseModule,
    ExamBaseQuestionModule,
    ExamBaseAttemptModule,
    TrainingModule,
    StorageModule,
    StripeModule,
    ClerkModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    /** Global authentication guard: verifies Clerk JWT on all routes (except @Public). */
    {
      provide: APP_GUARD,
      useClass: ClerkJwtAuthGuard,
    },
    /** Global roles guard: checks @Roles() on all routes (allows access if no @Roles decorator). */
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
