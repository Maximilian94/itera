import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { Roles } from '../common/decorators/roles.decorator';
import { CopyQuestionDto } from './dto/copy-question.dto';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { CreateExamBaseQuestionDto } from './dto/create-exam-base-question.dto';
import { ParseQuestionsFromMarkdownDto } from './dto/parse-questions-from-markdown.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';
import { ExamBaseQuestionService } from './exam-base-question.service';
import { StorageService } from '../storage/storage.service';

const STATEMENT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;
const STATEMENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Controller de questões de bases de prova. Operações de leitura são abertas
 * para qualquer usuário autenticado; operações de escrita exigem role ADMIN.
 */
@Controller('exam-bases/:examBaseId/questions')
export class ExamBaseQuestionController {
  constructor(
    private readonly service: ExamBaseQuestionService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  list(@Param('examBaseId') examBaseId: string) {
    return this.service.list(examBaseId);
  }

  @Get('available-to-add')
  listAvailableToAdd(
    @Param('examBaseId') examBaseId: string,
    @Query('subject') subject?: string,
  ) {
    return this.service.listAvailableToAdd(examBaseId, subject);
  }

  @Get('available-to-add/subjects')
  listAvailableSubjects(@Param('examBaseId') examBaseId: string) {
    return this.service.listAvailableSubjects(examBaseId);
  }

  /** Copia uma questão de outra base. Apenas ADMIN. */
  @Post('copy')
  @Roles('ADMIN')
  copyQuestion(
    @Param('examBaseId') examBaseId: string,
    @Body() dto: CopyQuestionDto,
  ) {
    return this.service.copyQuestion(
      examBaseId,
      dto.sourceExamBaseId,
      dto.sourceQuestionId,
    );
  }

  /** Cria uma questão na base de prova. Apenas ADMIN. */
  @Post()
  @Roles('ADMIN')
  create(
    @Param('examBaseId') examBaseId: string,
    @Body() dto: CreateExamBaseQuestionDto,
  ) {
    return this.service.create(examBaseId, dto);
  }

  /** Faz parsing de questões a partir de Markdown. Apenas ADMIN. */
  @Post('parse-from-markdown')
  @Roles('ADMIN')
  parseFromMarkdown(
    @Param('examBaseId') _examBaseId: string,
    @Body() dto: ParseQuestionsFromMarkdownDto,
  ) {
    console.log('dto', dto);
    return this.service.parseQuestionsFromMarkdown(dto.markdown);
  }

  /** Extrai questões de um PDF. Apenas ADMIN. */
  @Post('extract-from-pdf')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async extractFromPdf(
    @Param('examBaseId') _examBaseId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname?: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const content = await this.service.extractPdfToMarkdown(file);
    return { content };
  }

  /** Faz upload da imagem do enunciado. Apenas ADMIN. */
  @Post('upload-statement-image')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: STATEMENT_IMAGE_MAX_SIZE },
    }),
  )
  async uploadStatementImage(
    @Param('examBaseId') examBaseId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!STATEMENT_IMAGE_MIMES.includes(file.mimetype as (typeof STATEMENT_IMAGE_MIMES)[number])) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${STATEMENT_IMAGE_MIMES.join(', ')}`,
      );
    }
    const url = await this.storage.uploadStatementImage(
      examBaseId,
      file.buffer,
      file.mimetype,
    );
    return { url };
  }

  @Get(':questionId')
  getOne(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.getOne(examBaseId, questionId);
  }

  /** Gera explicações para alternativas via IA. Apenas ADMIN. */
  @Post(':questionId/generate-explanations')
  @Roles('ADMIN')
  generateExplanations(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.generateExplanations(examBaseId, questionId);
  }

  /** Atualiza uma questão da base. Apenas ADMIN. */
  @Patch(':questionId')
  @Roles('ADMIN')
  update(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamBaseQuestionDto,
  ) {
    return this.service.update(examBaseId, questionId, dto);
  }

  /** Removes a question from the base. Admin only. */
  @Delete(':questionId')
  @Roles('ADMIN')
  async delete(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ): Promise<void> {
    await this.service.delete(examBaseId, questionId);
  }

  /** Creates an alternative for a question. Admin only. */
  @Post(':questionId/alternatives')
  @Roles('ADMIN')
  createAlternative(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Body() dto: CreateAlternativeDto,
  ) {
    return this.service.createAlternative(examBaseId, questionId, dto);
  }

  /** Updates an alternative. Admin only. */
  @Patch(':questionId/alternatives/:alternativeId')
  @Roles('ADMIN')
  updateAlternative(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Param('alternativeId') alternativeId: string,
    @Body() dto: UpdateAlternativeDto,
  ) {
    return this.service.updateAlternative(
      examBaseId,
      questionId,
      alternativeId,
      dto,
    );
  }

  /** Removes an alternative. Admin only. */
  @Delete(':questionId/alternatives/:alternativeId')
  @Roles('ADMIN')
  async deleteAlternative(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Param('alternativeId') alternativeId: string,
  ): Promise<void> {
    await this.service.deleteAlternative(
      examBaseId,
      questionId,
      alternativeId,
    );
  }
}
