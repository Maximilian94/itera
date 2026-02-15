import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../common/guards/access.guard';
import { ExamBaseAttemptService } from './exam-base-attempt.service';

/**
 * Controller for exam attempt history. All endpoints require an active subscription.
 */
@Controller('exam-base-attempts')
@UseGuards(AccessGuard)
export class ExamBaseAttemptHistoryController {
  constructor(private readonly service: ExamBaseAttemptService) {}

  @Get('history')
  listHistory(
    @Req() req: { user: { userId: string } },
    @Query('examBaseId') examBaseId?: string,
  ) {
    return this.service.listHistory(req.user.userId, examBaseId);
  }
}
