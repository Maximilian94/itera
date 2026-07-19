import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { CargoModule } from '../cargo/cargo.module';
import { ExamBaseModule } from '../examBase/exam-base.module';
import { PdfModule } from '../pdf/pdf.module';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';
import { PciParserService } from './pci-parser.service';
import { DocumentScraperService } from './document-scraper.service';
import { ConcursoDocumentAnalysisService } from './concurso-document-analysis.service';
import { NormalizerService } from './normalizer.service';
import { ScoringService } from './scoring.service';
import { SCRAPER_QUEUE_NAME } from './scraper.constants';

@Module({
  imports: [
    PrismaModule,
    CargoModule,
    ExamBaseModule,
    PdfModule,
    BullModule.registerQueue({ name: SCRAPER_QUEUE_NAME }),
  ],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    ScraperProcessor,
    PciParserService,
    DocumentScraperService,
    ConcursoDocumentAnalysisService,
    NormalizerService,
    ScoringService,
  ],
})
export class ScraperModule {}
