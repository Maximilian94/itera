import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../common/guards/access.guard';
import { ExamBaseAttemptService } from './exam-base-attempt.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { UpsertAnswerDto } from './dto/upsert-answer.dto';

/**
 * Controller for exam base attempts. All endpoints require an active subscription
 * (any plan). The AccessGuard is applied at the controller level.
 */
@Controller('exam-bases/:examBaseId/attempts')
@UseGuards(AccessGuard)
export class ExamBaseAttemptController {
  constructor(private readonly service: ExamBaseAttemptService) {}

  @Get()
  list(
    @Param('examBaseId') examBaseId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.list(examBaseId, req.user.userId);
  }

  @Post()
  create(
    @Param('examBaseId') examBaseId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto?: CreateAttemptDto,
  ) {
    return this.service.create(examBaseId, req.user.userId, dto);
  }

  /**
   * POST /:attemptId/feedback/generate
   * Generates AI feedback per subject for a finished attempt (e.g. for older attempts).
   */
  @Post(':attemptId/feedback/generate')
  generateFeedback(
    @Param('examBaseId') examBaseId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.generateSubjectFeedback(
      examBaseId,
      attemptId,
      req.user.userId,
    );
  }

  @Get(':attemptId/feedback')
  getFeedback(
    @Param('examBaseId') examBaseId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getFeedback(examBaseId, attemptId, req.user.userId);
  }

  @Get(':attemptId')
  getOne(
    @Param('examBaseId') examBaseId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getExamAttemptWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      req.user.userId,
    );
  }

  @Patch(':attemptId/answers')
  upsertAnswer(
    @Param('examBaseId') examBaseId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpsertAnswerDto,
  ) {
    return this.service.upsertAnswer(
      examBaseId,
      attemptId,
      req.user.userId,
      dto,
    );
  }

  @Patch(':attemptId/finish')
  finish(
    @Param('examBaseId') examBaseId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.finish(examBaseId, attemptId, req.user.userId);
  }

}
