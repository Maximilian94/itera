import { Module } from '@nestjs/common';
import { ExamBaseController } from './exam-base.controller';
import { ExamBaseService } from './exam-base.service';

@Module({
  controllers: [ExamBaseController],
  providers: [ExamBaseService],
})
export class ExamBaseModule {}

