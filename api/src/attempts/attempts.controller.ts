import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { CreateAttemptDto } from './dto/create-attempt.dto';
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
}
