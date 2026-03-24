import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OnboardingOrAccessGuard } from '../common/guards/onboarding-or-access.guard';
import { TrainingService } from './training.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { UpsertRetryAnswerDto } from './dto/upsert-retry-answer.dto';

/**
 * Controller for intelligent training sessions.
 * - list: open to all authenticated users.
 * - create: no guard — service layer handles quota (1 free onboarding + subscription limits).
 * - all other endpoints: OnboardingOrAccessGuard (active subscription OR onboarding user).
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
   * Creates a new training session. Authorization is handled entirely in the
   * service layer: new users get 1 free training (onboarding), after which an
   * active subscription with the correct plan and available monthly quota is required.
   */
  @Post('exam-bases/:examBaseId')
  create(
    @Param('examBaseId') examBaseId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto?: CreateTrainingDto,
  ) {
    return this.service.create(examBaseId, req.user.userId, dto);
  }

  @Get(':trainingId/study-items')
  @UseGuards(OnboardingOrAccessGuard)
  listStudyItems(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listStudyItems(trainingId, req.user.userId);
  }

  @Post(':trainingId/study-items/:studyItemId/generate')
  @UseGuards(OnboardingOrAccessGuard)
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
  @UseGuards(OnboardingOrAccessGuard)
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
  @UseGuards(OnboardingOrAccessGuard)
  getOne(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getOne(trainingId, req.user.userId);
  }

  @Patch(':trainingId/stage')
  @UseGuards(OnboardingOrAccessGuard)
  updateStage(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(trainingId, req.user.userId, dto);
  }

  @Patch(':trainingId/study')
  @UseGuards(OnboardingOrAccessGuard)
  updateStudy(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStudyDto,
  ) {
    return this.service.updateStudy(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/retry-questions')
  @UseGuards(OnboardingOrAccessGuard)
  listRetryQuestions(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listRetryQuestions(trainingId, req.user.userId);
  }

  @Get(':trainingId/retry-questions/with-feedback-for-study')
  @UseGuards(OnboardingOrAccessGuard)
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
  @UseGuards(OnboardingOrAccessGuard)
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
  @UseGuards(OnboardingOrAccessGuard)
  getRetryAnswers(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getRetryAnswers(trainingId, req.user.userId);
  }

  @Patch(':trainingId/retry-answers')
  @UseGuards(OnboardingOrAccessGuard)
  upsertRetryAnswer(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpsertRetryAnswerDto,
  ) {
    return this.service.upsertRetryAnswer(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/final')
  @UseGuards(OnboardingOrAccessGuard)
  getFinal(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getFinal(trainingId, req.user.userId);
  }
}
