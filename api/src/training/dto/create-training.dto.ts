import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTrainingDto {
  /**
   * When provided, only questions from these subjects are included in the training exam.
   * When null/undefined/empty, all questions from the exam base are included.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectFilter?: string[];

  /**
   * When true (default), the prova phase reveals correct/wrong + explanation
   * right after each answer. When false, feedback is shown only after finishing.
   */
  @IsOptional()
  @IsBoolean()
  immediateFeedback?: boolean;
}
