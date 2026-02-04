import { IsArray, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  @ValidateIf((_o, v) => v != null)
  @IsString()
  statementImageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @IsString()
  referenceText?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  correctAlternative?: string;
}
