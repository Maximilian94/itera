import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalService } from './goal.service';

@Module({
  controllers: [GoalsController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
