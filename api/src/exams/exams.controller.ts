import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateExamDto) {
    return this.exams.createExam({
      userId: req.user.userId,
      skillIds: dto.skillIds,
      onlyUnsolved: dto.onlyUnsolved,
      questionCount: dto.questionCount,
    });
  }

  @Get(':id')
  getOne(@Req() req: { user: { userId: string } }, @Param('id') examId: string) {
    return this.exams.getExamQuestions({ userId: req.user.userId, examId });
  }
}


