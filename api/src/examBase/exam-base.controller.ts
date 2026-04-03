import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExamBaseDto } from './dto/create-exam-base.dto';
import { ExtractMetadataDto } from './dto/extract-metadata.dto';
import { GetExamBasesQueryDto } from './dto/get-exam-bases.query';
import { UpdateExamBaseDto } from './dto/update-exam-base.dto';
import { ExamBaseAiService } from './exam-base-ai.service';
import { ExamBaseService } from './exam-base.service';

@Controller('exam-bases')
export class ExamBaseController {
  constructor(
    private readonly examBases: ExamBaseService,
    private readonly examBaseAi: ExamBaseAiService,
  ) {}

  @Get()
  list(
    @Query() query: GetExamBasesQueryDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.examBases.list(
      { examBoardId: query.examBoardId },
      req.user.userId,
    );
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.examBases.getOne(id, req.user?.userId);
  }

  /** Creates an empty draft exam base and returns its id. Admin only. */
  @Post('draft')
  @Roles('ADMIN')
  createDraft() {
    return this.examBases.createDraft();
  }

  /**
   * Extracts exam metadata from a URL or PDF using AI. Admin only.
   * Accepts multipart/form-data with optional fields: url (string) and pdfFile (file).
   */
  @Post('extract-metadata')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('pdfFile'))
  extractMetadata(
    @Body() dto: ExtractMetadataDto,
    @UploadedFile()
    pdfFile?: { buffer: Buffer; mimetype: string; originalname?: string },
  ) {
    return this.examBaseAi.extractMetadata({
      url: dto.url,
      role: dto.role,
      pdfFile,
    });
  }

  /** Creates a new exam base. Admin only. */
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateExamBaseDto) {
    return this.examBases.create(dto);
  }

  /** Generates and saves slug for the exam base (banca-estado-cidade-ano-cargo). Admin only. */
  @Post(':id/generate-slug')
  @Roles('ADMIN')
  generateSlug(@Param('id') id: string) {
    return this.examBases.generateSlug(id);
  }

  /** Publishes or unpublishes an exam. Admin only. Unpublished exams are not visible to non-admin users. */
  @Patch(':id/publish')
  @Roles('ADMIN')
  setPublished(
    @Param('id') id: string,
    @Body() body: { published: boolean },
  ) {
    return this.examBases.setPublished(id, body.published);
  }

  /** Updates an existing exam base. Admin only. */
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateExamBaseDto) {
    return this.examBases.update(id, dto);
  }

  /** Deletes an exam base and all related data (questions, attempts, etc.). Admin only. */
  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.examBases.remove(id);
  }
}
