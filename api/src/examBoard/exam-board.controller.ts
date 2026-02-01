import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateExamBoardDto } from './dto/create-exam-board.dto';
import { UpdateExamBoardDto } from './dto/update-exam-board.dto';
import { ExamBoardService } from './exam-board.service';

@Controller('exam-boards')
export class ExamBoardController {
  constructor(private readonly examBoards: ExamBoardService) {}

  @Get()
  list() {
    return this.examBoards.list();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.examBoards.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateExamBoardDto) {
    return this.examBoards.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExamBoardDto) {
    return this.examBoards.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examBoards.remove(id);
  }
}
