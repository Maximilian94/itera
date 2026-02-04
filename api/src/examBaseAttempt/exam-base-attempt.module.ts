import { Module } from '@nestjs/common';
import { ExamBaseAttemptController } from './exam-base-attempt.controller';
import { ExamBaseAttemptService } from './exam-base-attempt.service';

@Module({
  controllers: [ExamBaseAttemptController],
  providers: [ExamBaseAttemptService],
})
export class ExamBaseAttemptModule {}
