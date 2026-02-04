import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { SkillsModule } from './skills/skills.module';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';
import { ExamsModule } from './exams/exams.module';
import { ExamBoardModule } from './examBoard/exam-board.module';
import { ExamBaseModule } from './examBase/exam-base.module';
import { ExamBaseQuestionModule } from './examBaseQuestion/exam-base-question.module';
import { ExamBaseAttemptModule } from './examBaseAttempt/exam-base-attempt.module';
import { StorageModule } from './storage/storage.module';

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
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
