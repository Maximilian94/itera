import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateAlternativeDto } from './dto/create-alternative.dto';
import { CreateExamBaseQuestionDto } from './dto/create-exam-base-question.dto';
import { ParseQuestionsFromMarkdownDto } from './dto/parse-questions-from-markdown.dto';
import { UpdateAlternativeDto } from './dto/update-alternative.dto';
import { UpdateExamBaseQuestionDto } from './dto/update-exam-base-question.dto';
import { ExamBaseQuestionService } from './exam-base-question.service';

@Controller('exam-bases/:examBaseId/questions')
export class ExamBaseQuestionController {
  constructor(private readonly service: ExamBaseQuestionService) {}

  @Get()
  list(@Param('examBaseId') examBaseId: string) {
    return this.service.list(examBaseId);
  }

  @Post()
  create(
    @Param('examBaseId') examBaseId: string,
    @Body() dto: CreateExamBaseQuestionDto,
  ) {
    return this.service.create(examBaseId, dto);
  }

  @Post('parse-from-markdown')
  parseFromMarkdown(
    @Param('examBaseId') _examBaseId: string,
    @Body() dto: ParseQuestionsFromMarkdownDto,
  ) {
    console.log('dto', dto);
    return this.service.parseQuestionsFromMarkdown(dto.markdown);
  }

  @Get(':questionId')
  getOne(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.getOne(examBaseId, questionId);
  }

  @Patch(':questionId')
  update(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamBaseQuestionDto,
  ) {
    return this.service.update(examBaseId, questionId, dto);
  }

  @Delete(':questionId')
  async delete(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
  ): Promise<void> {
    await this.service.delete(examBaseId, questionId);
  }

  @Post(':questionId/alternatives')
  createAlternative(
    @Param('examBaseId') examBaseId: string,
    @Param('questionId') questionId: string,
    @Body() dto: CreateAlternativeDto,
  ) {
    return this.service.createAlternative(examBaseId, questionId, dto);
  }

  @Patch(':questionId/alternatives/:alternativeId')
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

  @Delete(':questionId/alternatives/:alternativeId')
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
