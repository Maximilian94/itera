import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { AnswerAttemptDto, CreateAttemptDto } from './dto/create-attempt.dto';
import { AttemptsService } from './attempts.service';

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateAttemptDto,
  ) {
    return this.attempts.createAttempt({
      userId: req.user.userId,
      examId: dto.examId,
      questionId: dto.questionId,
      selectedOptionId: dto.selectedOptionId,
    });
  }

  @Get()
  get(
    @Req() req: { user: { userId: string } },
    @Query('examId') examId: string,
  ) {
    return this.attempts.getAttempts({
      userId: req.user.userId,
      examId: examId ?? undefined,
    });
  }

  @Get('v2')
  getV2(
    @Req() req: { user: { userId: string } },
    @Query('examId') examId: string,
  ) {
    return this.attempts.getAttemptsV2({
      userId: req.user.userId,
      examId: examId ?? undefined,
    });
  }

  @Post('answer')
  answer(
    @Req() req: { user: { userId: string } },
    @Body() dto: AnswerAttemptDto,
  ) {
    return this.attempts.answer({
      userId: req.user.userId,
      attemptId: dto.attemptId,
      optionSelectedId: dto.optionSelectedId,
    });
  }
}
