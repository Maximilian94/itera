import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { TrainingService } from './training.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { UpsertRetryAnswerDto } from './dto/upsert-retry-answer.dto';

@Controller('training')
export class TrainingController {
  constructor(private readonly service: TrainingService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.service.list(req.user.userId);
  }

  @Post('exam-bases/:examBaseId')
  create(
    @Param('examBaseId') examBaseId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.create(examBaseId, req.user.userId);
  }

  @Get(':trainingId/study-items')
  listStudyItems(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listStudyItems(trainingId, req.user.userId);
  }

  @Post(':trainingId/study-items/:studyItemId/generate')
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
  getOne(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getOne(trainingId, req.user.userId);
  }

  @Patch(':trainingId/stage')
  updateStage(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(trainingId, req.user.userId, dto);
  }

  @Patch(':trainingId/study')
  updateStudy(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateStudyDto,
  ) {
    return this.service.updateStudy(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/retry-questions')
  listRetryQuestions(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.listRetryQuestions(trainingId, req.user.userId);
  }

  @Get(':trainingId/retry-questions/with-feedback')
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
  getRetryAnswers(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getRetryAnswers(trainingId, req.user.userId);
  }

  @Patch(':trainingId/retry-answers')
  upsertRetryAnswer(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
    @Body() dto: UpsertRetryAnswerDto,
  ) {
    return this.service.upsertRetryAnswer(trainingId, req.user.userId, dto);
  }

  @Get(':trainingId/final')
  getFinal(
    @Param('trainingId') trainingId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getFinal(trainingId, req.user.userId);
  }
}
