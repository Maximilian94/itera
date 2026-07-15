import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PciEntryStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScraperService } from './scraper.service';
import { PdfLinkExtractorService } from './pdf-link-extractor.service';

class TriggerRunDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cargoSlugs?: string[];
}

class UpdateEntryStatusDto {
  @IsEnum(PciEntryStatus)
  status: PciEntryStatus;
}

class ExtractPdfsDto {
  @IsUrl({ require_protocol: true })
  url: string;
}

@Controller('admin/scraper')
@Roles('ADMIN')
export class ScraperController {
  constructor(
    private readonly scraper: ScraperService,
    private readonly pdfExtractor: PdfLinkExtractorService,
  ) {}

  @Post('extract-pdfs')
  extractPdfs(@Body() dto: ExtractPdfsDto) {
    return this.pdfExtractor.extractFromUrl(dto.url);
  }

  @Post('run')
  triggerRun(@Body() dto: TriggerRunDto) {
    return this.scraper.triggerRun(dto.cargoSlugs);
  }

  @Get('runs')
  listRuns() {
    return this.scraper.listRuns();
  }

  @Get('runs/:id')
  getRunStatus(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scraper.getRunStatus(id);
  }

  @Get('entries')
  listEntries() {
    return this.scraper.listEntries();
  }

  @Get('entries/diff/:runId')
  getRunDiff(@Param('runId', new ParseUUIDPipe()) runId: string) {
    return this.scraper.getRunDiff(runId);
  }

  @Patch('entries/:id')
  updateEntryStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEntryStatusDto,
  ) {
    return this.scraper.updateEntryStatus(id, dto.status);
  }

  @Post('entries/:id/promote')
  promoteEntry(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scraper.promoteEntry(id);
  }
}
