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
import { CreateExamBaseDto } from './dto/create-exam-base.dto';
import { GetExamBasesQueryDto } from './dto/get-exam-bases.query';
import { UpdateExamBaseDto } from './dto/update-exam-base.dto';
import { ExamBaseService } from './exam-base.service';

@Controller('exam-bases')
export class ExamBaseController {
  constructor(private readonly examBases: ExamBaseService) {}

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
  getOne(@Param('id') id: string) {
    return this.examBases.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateExamBaseDto) {
    return this.examBases.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamBaseDto) {
    return this.examBases.update(id, dto);
  }
}
