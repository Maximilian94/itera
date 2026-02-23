import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { GetExamBasesQueryDto } from './dto/get-exam-bases.query';
import { ExamBaseService } from './exam-base.service';

/**
 * Endpoints públicos para a landing page de concursos.
 * Sem autenticação. Retorna apenas concursos publicados com os campos necessários.
 */
@Controller('public/exam-bases')
@Public()
export class PublicExamBaseController {
  constructor(private readonly examBases: ExamBaseService) {}

  @Get()
  list(@Query() query: GetExamBasesQueryDto) {
    return this.examBases.list(
      { examBoardId: query.examBoardId },
      undefined, // sem userId = apenas publicados, sem userStats
    );
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.examBases.getBySlug(slug, undefined);
  }
}
