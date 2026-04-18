import { Module } from '@nestjs/common';
import { ExamBaseAttemptController } from './exam-base-attempt.controller';
import { ExamBaseAttemptHistoryController } from './exam-base-attempt-history.controller';
import { ExamBaseAttemptService } from './exam-base-attempt.service';
import { ExamAbandonmentJob } from './exam-abandonment.job';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [
    ExamBaseAttemptController,
    ExamBaseAttemptHistoryController,
  ],
  providers: [ExamBaseAttemptService, ExamAbandonmentJob],
  exports: [ExamBaseAttemptService],
})
export class ExamBaseAttemptModule {}
