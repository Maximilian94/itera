import { Module } from '@nestjs/common';
import { ExamBaseAttemptController } from './exam-base-attempt.controller';
import { ExamBaseAttemptHistoryController } from './exam-base-attempt-history.controller';
import { ExamBaseAttemptService } from './exam-base-attempt.service';

@Module({
  controllers: [
    ExamBaseAttemptController,
    ExamBaseAttemptHistoryController,
  ],
  providers: [ExamBaseAttemptService],
  exports: [ExamBaseAttemptService],
})
export class ExamBaseAttemptModule {}
