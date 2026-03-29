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
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';
import { ExamBaseQuestionService } from './exam-base-question.service';
import { ExamBaseQuestionPdfAiService } from './exam-base-question-pdf-ai.service';
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
    private readonly pdfAi: ExamBaseQuestionPdfAiService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Parses nursing questions from pre-extracted markdown + gabarito PDF.
   * Step 1 (Nanonets → markdown) is done client-side via extract-from-pdf.
   * Step 2 (Claude Haiku → answer key) + Step 3 (GPT-4o chunks) are done here.
   * Returns structured questions for review — does NOT save to DB. Admin only.
   */
  @Post('parse-from-markdown-and-gabarito')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('gabaritoPdf'))
  async parseFromMarkdownAndGabarito(
    @Param('examBaseId') _examBaseId: string,
    @Body('markdown') markdown: string,
    @UploadedFile() gabaritoPdf: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!markdown?.trim()) throw new BadRequestException('markdown is required');
    if (!gabaritoPdf) throw new BadRequestException('gabaritoPdf is required');
    const questions = await this.pdfAi.parseQuestionsFromMarkdownAndGabarito(
      markdown,
      gabaritoPdf.buffer,
    );
    return { questions };
  }

  /**
   * Extracts answer key from gabarito PDF using Claude Haiku.
   * Returns { answerKey: { "1": "A", "2": "C", ... } }. Admin only.
   */
  @Post('extract-gabarito-answer-key')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('gabaritoPdf'))
  async extractGabaritoAnswerKey(
    @Param('examBaseId') _examBaseId: string,
    @UploadedFile() gabaritoPdf: { buffer: Buffer; mimetype: string } | undefined,
    @Body('cargo') cargo?: string,
  ) {
    if (!gabaritoPdf) throw new BadRequestException('gabaritoPdf is required');
    const answerKey = await this.pdfAi.extractGabaritoAnswerKey(
      gabaritoPdf.buffer,
      cargo?.trim() || undefined,
    );
    return { answerKey };
  }

/**
   * Parses question structure from a markdown chunk via Claude Sonnet.
   * Returns { questions: ParsedQuestionStructure[] }. Admin only.
   */
  @Post('parse-questions-structure')
  @Roles('ADMIN')
  async parseQuestionsStructure(
    @Param('examBaseId') _examBaseId: string,
    @Body() body: { markdownChunk: string },
  ) {
    if (!body.markdownChunk?.trim()) throw new BadRequestException('markdownChunk is required');
    const questions = await this.pdfAi.parseQuestionsStructureFromChunk(body.markdownChunk);
    return { questions };
  }

  /**
   * Phase 5: Generates explanations inline (without a DB question) using xAI Grok.
   * Returns GenerateExplanationsResponse. Admin only.
   */
  @Post('generate-explanations-inline')
  @Roles('ADMIN')
  async generateExplanationsInline(
    @Param('examBaseId') _examBaseId: string,
    @Body() body: {
      subject?: string;
      statement: string;
      referenceText?: string | null;
      statementImageUrl?: string | null;
      correctAlternative: string;
      alternatives: { key: string; text: string }[];
      examName?: string;
    },
  ) {
    if (!body.statement?.trim()) throw new BadRequestException('statement is required');
    if (!body.correctAlternative?.trim()) throw new BadRequestException('correctAlternative is required');
    return this.service.generateExplanationsInline(body);
  }

  /**
   * Parses a single markdown chunk using the provided answer key via GPT-4o.
   * Returns { questions: ParsedQuestionFromPdf[] }. Admin only.
   */
  @Post('parse-markdown-chunk')
  @Roles('ADMIN')
  async parseMarkdownChunk(
    @Param('examBaseId') _examBaseId: string,
    @Body() body: { markdownChunk: string; answerKey: Record<string, string> },
  ) {
    if (!body.markdownChunk?.trim()) throw new BadRequestException('markdownChunk is required');
    const questions = await this.pdfAi.parseMarkdownChunk(
      body.markdownChunk,
      body.answerKey ?? {},
    );
    return { questions };
  }

  /** Saves an array of questions in batch. Admin only. */
  @Post('batch')
  @Roles('ADMIN')
  createBatch(
    @Param('examBaseId') examBaseId: string,
    @Body() body: { questions: CreateExamBaseQuestionDto[] },
  ) {
    return this.service.createBatch(examBaseId, body.questions ?? []);
  }

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

  @Get('stats-by-subject')
  getQuestionsCountBySubject(@Param('examBaseId') examBaseId: string) {
    return this.service.getQuestionsCountBySubject(examBaseId);
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

  /** Reordena questões da base. Apenas ADMIN. */
  @Patch('reorder')
  @Roles('ADMIN')
  reorder(
    @Param('examBaseId') examBaseId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.service.reorder(examBaseId, dto.questionIds);
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
    return this.service.parseQuestionsFromMarkdown(
      dto.markdown,
      dto.provider ?? 'grok',
    );
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

  /** Gera metadados (topic, subtopics, skills) da questão via IA. Apenas ADMIN. */
  @Post(':questionId/generate-metadata')
  @Roles('ADMIN')
  generateMetadata(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.generateMetadata(examBaseId, questionId);
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
