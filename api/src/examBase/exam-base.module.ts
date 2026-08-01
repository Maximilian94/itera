import { Module } from '@nestjs/common';
import { CargoModule } from '../cargo/cargo.module';
import { PdfModule } from '../pdf/pdf.module';
import { ExamBaseAiService } from './exam-base-ai.service';
import { ExamBaseController } from './exam-base.controller';
import { ExamBaseService } from './exam-base.service';
import { ExamSyllabusGroupService } from './exam-syllabus-group.service';
import { PublicExamBaseController } from './public-exam-base.controller';

@Module({
  // CargoModule: Cargo default 1:1 + dual-write na escrita da prova (R4.1).
  imports: [CargoModule, PdfModule],
  controllers: [ExamBaseController, PublicExamBaseController],
  providers: [ExamBaseService, ExamBaseAiService, ExamSyllabusGroupService],
  // ScraperModule (análise de documentos / Fase 2) reusa o extrator focado de
  // conteúdo programático por cargo.
  exports: [ExamBaseAiService],
})
export class ExamBaseModule {}
