import { Module } from '@nestjs/common';
import { ExamBaseAiService } from './exam-base-ai.service';
import { ExamBaseController } from './exam-base.controller';
import { ExamBaseService } from './exam-base.service';
import { ExamSyllabusGroupService } from './exam-syllabus-group.service';
import { PublicExamBaseController } from './public-exam-base.controller';

@Module({
  controllers: [ExamBaseController, PublicExamBaseController],
  providers: [ExamBaseService, ExamBaseAiService, ExamSyllabusGroupService],
})
export class ExamBaseModule {}

