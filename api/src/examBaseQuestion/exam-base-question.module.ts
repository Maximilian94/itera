import { Module } from '@nestjs/common';
import { ExamBaseQuestionController } from './exam-base-question.controller';
import { ExamBaseQuestionPdfAiService } from './exam-base-question-pdf-ai.service';
import { ExamBaseQuestionService } from './exam-base-question.service';

@Module({
  controllers: [ExamBaseQuestionController],
  providers: [ExamBaseQuestionService, ExamBaseQuestionPdfAiService],
})
export class ExamBaseQuestionModule {}
