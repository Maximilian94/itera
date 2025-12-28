import { Controller, Get, Query, Req } from '@nestjs/common';
import { GetQuestionsQueryDto } from './dto/get-questions.query';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  list(@Req() req: { user: { userId: string } }, @Query() query: GetQuestionsQueryDto) {
    return this.questions.listQuestions({
      userId: req.user.userId,
      skillIds: query.skillIds,
      onlyUnsolved: query.onlyUnsolved,
    });
  }
}
