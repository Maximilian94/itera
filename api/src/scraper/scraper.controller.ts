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
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { ScraperService } from './scraper.service';
import { DocumentScraperService } from './document-scraper.service';
import { ConcursoDocumentAnalysisService } from './concurso-document-analysis.service';

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

class ScrapeDocumentsDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'Informe uma URL válida (com http/https).' },
  )
  url: string;
}

class ScrapeHtmlDto {
  @IsString()
  @MinLength(1, { message: 'Cole o HTML da página.' })
  html: string;

  @IsUrl(
    { require_protocol: true },
    { message: 'Informe a URL de origem da página (com http/https).' },
  )
  sourceUrl: string;
}

/** "Verificar novas publicações": re-raspa a origem (ou usa HTML colado). */
class CheckConcursoDocumentsDto {
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'Informe uma URL válida (com http/https).' },
  )
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  html?: string;
}

class NewDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  kind?: string | null;

  @IsOptional()
  @IsString()
  publishedAt?: string | null;
}

class AddConcursoDocumentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NewDocumentDto)
  documents: NewDocumentDto[];
}

/** Uma mudança proposta escolhida pelo admin para aplicar (Fase 2). */
class ProposedChangeDto {
  @IsString()
  id: string;

  @IsEnum(['concurso', 'cargo'])
  target: 'concurso' | 'cargo';

  @IsOptional()
  @IsString()
  cargoId?: string | null;

  @IsOptional()
  @IsString()
  cargoRole?: string | null;

  @IsString()
  field: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  currentValue?: string | null;

  @IsOptional()
  @IsString()
  newValue?: string | null;

  @IsOptional()
  @IsString()
  evidence?: string | null;
}

/** Etapa do cronograma proposto, aprovada pelo admin. */
class EtapaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  date?: string | null;
}

/** Uma matéria do quadro de provas proposto, aprovada pelo admin. */
class SyllabusGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  topics?: string | null;

  @IsOptional()
  @IsInt()
  questionCount?: number | null;

  @IsOptional()
  @IsString()
  weight?: string | null;

  @IsOptional()
  @IsString()
  maxScore?: string | null;
}

/** Quadro de matérias de um cargo aprovado (substitui o quadro atual dele). */
class ApplyCargoSyllabusDto {
  @IsString()
  cargoId: string;

  /** Só rótulo (o front reenvia o objeto inteiro do analyze) — ignorado no apply. */
  @IsOptional()
  @IsString()
  cargoRole?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusGroupDto)
  groups: SyllabusGroupDto[];
}

class ApplyChangesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposedChangeDto)
  changes: ProposedChangeDto[];

  /** Cronograma aprovado (substitui as etapas do concurso). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaDto)
  cronograma?: EtapaDto[] | null;

  /** Quadros de matérias aprovados (replace por cargo). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyCargoSyllabusDto)
  syllabus?: ApplyCargoSyllabusDto[] | null;
}

@Controller('admin/scraper')
@Roles('ADMIN')
export class ScraperController {
  constructor(
    private readonly scraper: ScraperService,
    private readonly documentScraper: DocumentScraperService,
    private readonly documentAnalysis: ConcursoDocumentAnalysisService,
  ) {}

  @Post('documents')
  scrapeDocuments(@Body() dto: ScrapeDocumentsDto) {
    return this.documentScraper.scrapeDocuments(dto.url);
  }

  /** Fallback p/ páginas com anti-bot forte (Cloudflare): o admin cola o HTML. */
  @Post('documents/from-html')
  scrapeFromHtml(@Body() dto: ScrapeHtmlDto) {
    return this.documentScraper.scrapeDocumentsFromHtml(
      dto.html,
      dto.sourceUrl,
    );
  }

  /** Aba Notícias: verifica novas publicações do concurso (re-raspa a origem). */
  @Post('concursos/:concursoId/documents/check')
  checkConcursoDocuments(
    @Param('concursoId', ParseUUIDPipe) concursoId: string,
    @Body() dto: CheckConcursoDocumentsDto,
  ) {
    return this.documentScraper.checkConcursoDocuments(concursoId, {
      sourceUrl: dto.sourceUrl,
      html: dto.html,
    });
  }

  /** Aba Notícias: adiciona os documentos escolhidos à timeline (upsert). */
  @Post('concursos/:concursoId/documents')
  addConcursoDocuments(
    @Param('concursoId', ParseUUIDPipe) concursoId: string,
    @Body() dto: AddConcursoDocumentsDto,
  ) {
    return this.documentScraper.addConcursoDocuments(concursoId, dto.documents);
  }

  /** Fase 2: lê o PDF do documento e propõe as mudanças (sem aplicar). */
  @Post('concursos/:concursoId/documents/:documentId/analyze')
  analyzeDocument(
    @Param('concursoId', ParseUUIDPipe) concursoId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentAnalysis.analyze(concursoId, documentId);
  }

  /** Fase 2: aplica ao concurso/cargos as mudanças aprovadas pelo admin. */
  @Post('concursos/:concursoId/documents/:documentId/apply')
  applyDocumentChanges(
    @Param('concursoId', ParseUUIDPipe) concursoId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ApplyChangesDto,
  ) {
    return this.documentAnalysis.apply(
      concursoId,
      documentId,
      dto.changes,
      dto.cronograma,
      dto.syllabus,
    );
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
