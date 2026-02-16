import { Controller, Get, Query, Req } from '@nestjs/common';
import { ExamBaseAttemptService } from './exam-base-attempt.service';

/**
 * Controller for exam attempt history. Requires authentication only.
 * Inactive users can view their past attempts (read-only).
 */
@Controller('exam-base-attempts')
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
