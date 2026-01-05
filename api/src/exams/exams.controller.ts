import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.exams.listExams({ userId: req.user.userId });
  }

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

  @Post(':id/start')
  start(@Req() req: { user: { userId: string } }, @Param('id') examId: string) {
    return this.exams.startExam({ userId: req.user.userId, examId });
  }

  @Post(':id/finish')
  finish(@Req() req: { user: { userId: string } }, @Param('id') examId: string) {
    return this.exams.finishExam({ userId: req.user.userId, examId });
  }

  @Get(':id/results')
  getResults(@Req() req: { user: { userId: string } }, @Param('id') examId: string) {
    return this.exams.getExamResults({ userId: req.user.userId, examId });
  }
}


