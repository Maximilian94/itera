import { Module } from '@nestjs/common';
import { ExamBaseQuestionController } from './exam-base-question.controller';
import { ExamBaseQuestionService } from './exam-base-question.service';

@Module({
  controllers: [ExamBaseQuestionController],
  providers: [ExamBaseQuestionService],
})
export class ExamBaseQuestionModule {}
