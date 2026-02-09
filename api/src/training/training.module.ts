import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { ExamBaseAttemptModule } from '../examBaseAttempt/exam-base-attempt.module';

@Module({
  imports: [ConfigModule, ExamBaseAttemptModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
