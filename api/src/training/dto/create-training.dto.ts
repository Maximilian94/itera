import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateTrainingDto {
  /**
   * When provided, only questions from these subjects are included in the training exam.
   * When null/undefined/empty, all questions from the exam base are included.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectFilter?: string[];
}
