import { Module } from '@nestjs/common';
import { ExamBoardController } from './exam-board.controller';
import { ExamBoardService } from './exam-board.service';

@Module({
  controllers: [ExamBoardController],
  providers: [ExamBoardService],
})
export class ExamBoardModule {}
