import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../common/guards/access.guard';
import { TrainingService } from './training.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { UpsertRetryAnswerDto } from './dto/upsert-retry-answer.dto';

/**
 * Controller for intelligent training sessions. Listing trainings is open to all
 * authenticated users. All other endpoints require an active subscription.
 * Creating trainings additionally requires Estratégico or Elite plan with
 * available monthly quota (enforced in the service layer).
 */
@Controller('training')
export class TrainingController {
  constructor(private readonly service: TrainingService) {}

  /** Lists the user's training sessions. Open to all authenticated users. */
  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.service.list(req.user.userId);
  }

  /**
   * Creates a new training session. Requires active subscription (AccessGuard).
   * The service also validates plan type (Estratégico/Elite) and monthly limits.
   */
  @Post('exam-bases/:examBaseId')
  @UseGuards(AccessGuard)
  create(
    @Param('examBaseId') examBaseId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.create(examBaseId, req.user.userId);
  }

  @Get(':trainingId/study-items')
  @UseGuards(AccessGuard)
  listStudyItems(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listStudyItems(trainingId, req.user.userId);
  }

  @Post(':trainingId/study-items/:studyItemId/generate')
  @UseGuards(AccessGuard)
  generateStudyItemContent(
    @Param('trainingId') trainingId: string,
    @Param('studyItemId') studyItemId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.generateStudyItemContent(
      trainingId,
      studyItemId,
      req.user.userId,
    );
  }

  @Patch(':trainingId/study-items/:studyItemId/complete')
  @UseGuards(AccessGuard)
  completeStudyItem(
    @Param('trainingId') trainingId: string,
    @Param('studyItemId') studyItemId: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { completed: boolean },
  ) {
    return this.service.completeStudyItem(
      trainingId,
      studyItemId,
      req.user.userId,
      body.completed,
    );
  }

  @Get(':trainingId')
  @UseGuards(AccessGuard)
  getOne(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getOne(trainingId, req.user.userId);
  }

  @Patch(':trainingId/stage')
  @UseGuards(AccessGuard)
  updateStage(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(trainingId, req.user.userId, dto);
  }

  @Patch(':trainingId/study')
  @UseGuards(AccessGuard)
  updateStudy(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStudyDto,
  ) {
    return this.service.updateStudy(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/retry-questions')
  @UseGuards(AccessGuard)
  listRetryQuestions(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listRetryQuestions(trainingId, req.user.userId);
  }

  @Get(':trainingId/retry-questions/with-feedback-for-study')
  @UseGuards(AccessGuard)
  listRetryQuestionsWithFeedbackForStudy(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listRetryQuestionsWithFeedbackForStudy(
      trainingId,
      req.user.userId,
    );
  }

  @Get(':trainingId/retry-questions/with-feedback')
  @UseGuards(AccessGuard)
  listRetryQuestionsWithFeedback(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listRetryQuestionsWithFeedback(
      trainingId,
      req.user.userId,
    );
  }

  @Get(':trainingId/retry-answers')
  @UseGuards(AccessGuard)
  getRetryAnswers(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getRetryAnswers(trainingId, req.user.userId);
  }

  @Patch(':trainingId/retry-answers')
  @UseGuards(AccessGuard)
  upsertRetryAnswer(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpsertRetryAnswerDto,
  ) {
    return this.service.upsertRetryAnswer(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/final')
  @UseGuards(AccessGuard)
  getFinal(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getFinal(trainingId, req.user.userId);
  }
}
