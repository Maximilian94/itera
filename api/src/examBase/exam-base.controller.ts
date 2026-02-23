import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExamBaseDto } from './dto/create-exam-base.dto';
import { GenerateSlugDto } from './dto/generate-slug.dto';
import { GetExamBasesQueryDto } from './dto/get-exam-bases.query';
import { UpdateExamBaseDto } from './dto/update-exam-base.dto';
import { ExamBaseService } from './exam-base.service';

@Controller('exam-bases')
export class ExamBaseController {
  constructor(private readonly examBases: ExamBaseService) {}

  @Get()
  list(
    @Query() query: GetExamBasesQueryDto,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.examBases.list(
      { examBoardId: query.examBoardId },
      req.user?.userId,
    );
  }

  /** Get exam base by slug (for public landing page). Must be before :id route. */
  @Get('slug/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.examBases.getBySlug(slug, req.user?.userId);
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.examBases.getOne(id, req.user?.userId);
  }

  /** Generates a slug from exam base data. Admin only. Used by the "Gerar slug" button. */
  @Post('generate-slug')
  @Roles('ADMIN')
  generateSlug(@Body() body: GenerateSlugDto) {
    return this.examBases.generateSlug(body);
  }

  /** Creates a new exam base. Admin only. */
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateExamBaseDto) {
    return this.examBases.create(dto);
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
}
