import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { ExamBaseAttemptModule } from '../examBaseAttempt/exam-base-attempt.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GoalModule } from '../goal/goal.module';

@Module({
  imports: [ConfigModule, ExamBaseAttemptModule, AnalyticsModule, GoalModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
