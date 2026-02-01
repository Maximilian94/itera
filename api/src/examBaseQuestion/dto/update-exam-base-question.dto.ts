import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * Example payload: { "subject": "Physics", "statement": "Updated statement." }
 * Alternatives are NOT updated here (use alternative routes).
 */
export class UpdateExamBaseQuestionDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subtopics?: string[];

  @IsOptional()
  @IsString()
  statement?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  correctAlternative?: string;
}
