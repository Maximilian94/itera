import { IsEnum } from 'class-validator';

export enum TrainingStageDto {
  EXAM = 'EXAM',
  DIAGNOSIS = 'DIAGNOSIS',
  STUDY = 'STUDY',
  RETRY = 'RETRY',
  FINAL = 'FINAL',
}

export class UpdateStageDto {
  @IsEnum(TrainingStageDto)
  stage: TrainingStageDto;
}
