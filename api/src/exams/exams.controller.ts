import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../common/guards/access.guard';
import { CreateExamDto } from './dto/create-exam.dto';
import { FinishExamDto } from './dto/finish-exam.dto';
import { GetExamsQueryDto } from './dto/get-exams.query';
import { ExamsService } from './exams.service';

/**
 * Controller for exams. Listing exams is open to all authenticated users.
 * All other endpoints (create, view, start, finish, results) require an active subscription.
 */
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  /** Lists exams. Open to all authenticated users (no subscription required). */
  @Get()
  list(
    @Req() req: { user: { userId: string } },
    @Query() query: GetExamsQueryDto,
  ) {
    return this.exams.listExams({
      userId: req.user.userId,
      examBoardId: query.examBoardId,
    });
  }

  /** Creates a new exam. Requires active subscription. */
  @Post()
  @UseGuards(AccessGuard)
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateExamDto) {
    return this.exams.createExam({
      userId: req.user.userId,
      examBoardId: dto.examBoardId,
      skillIds: dto.skillIds,
      onlyUnsolved: dto.onlyUnsolved,
      questionCount: dto.questionCount,
    });
  }

  @Get(':id')
  @UseGuards(AccessGuard)
  getOne(
    @Req() req: { user: { userId: string } },
    @Param('id') examId: string,
  ) {
    return this.exams.getExamQuestions({ userId: req.user.userId, examId });
  }

  @Get('v2/:id')
  @UseGuards(AccessGuard)
  getExam(
    @Req() req: { user: { userId: string } },
    @Param('id') examId: string,
  ) {
    return this.exams.getExam({ userId: req.user.userId, examId });
  }

  @Post(':id/start')
  @UseGuards(AccessGuard)
  start(@Req() req: { user: { userId: string } }, @Param('id') examId: string) {
    return this.exams.startExam({ userId: req.user.userId, examId });
  }

  @Patch('finish')
  @UseGuards(AccessGuard)
  finish(@Req() req: { user: { userId: string } }, @Body() dto: FinishExamDto) {
    return this.exams.finishExam({
      userId: req.user.userId,
      examId: dto.examId,
    });
  }

  @Get(':id/results')
  @UseGuards(AccessGuard)
  getResults(
    @Req() req: { user: { userId: string } },
    @Param('id') examId: string,
  ) {
    return this.exams.getExamResults({ userId: req.user.userId, examId });
  }
}
