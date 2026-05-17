import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';
import { PciParserService } from './pci-parser.service';
import { NormalizerService } from './normalizer.service';
import { ScoringService } from './scoring.service';
import { SCRAPER_QUEUE_NAME } from './scraper.constants';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: SCRAPER_QUEUE_NAME }),
  ],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    ScraperProcessor,
    PciParserService,
    NormalizerService,
    ScoringService,
  ],
})
export class ScraperModule {}
