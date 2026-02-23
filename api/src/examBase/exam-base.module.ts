import { Module } from '@nestjs/common';
import { ExamBaseController } from './exam-base.controller';
import { ExamBaseService } from './exam-base.service';
import { PublicExamBaseController } from './public-exam-base.controller';

@Module({
  controllers: [ExamBaseController, PublicExamBaseController],
  providers: [ExamBaseService],
})
export class ExamBaseModule {}

