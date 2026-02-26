import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateAttemptDto {
  /**
   * When provided, only questions from these subjects are included in the attempt.
   * When null/undefined/empty, all questions from the exam base are included.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectFilter?: string[];
}
