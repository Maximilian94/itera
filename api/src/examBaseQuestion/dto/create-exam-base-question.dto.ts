import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAlternativeDto } from './create-alternative.dto';

/**
 * Example payload:
 * {
 *   "subject": "Mathematics",
 *   "topic": "Algebra",
 *   "subtopics": ["Linear equations", "Quadratic"],
 *   "statement": "What is 2 + 2?",
 *   "skills": ["arithmetic"],
 *   "correctAlternative": "B",
 *   "alternatives": [
 *     { "key": "A", "text": "3", "explanation": "Incorrect." },
 *     { "key": "B", "text": "4", "explanation": "Correct." }
 *   ]
 * }
 */
export class CreateExamBaseQuestionDto {
  @IsString()
  subject: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subtopics?: string[];

  @IsString()
  statement: string;

  @IsOptional()
  @IsString()
  statementImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  correctAlternative?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAlternativeDto)
  alternatives?: CreateAlternativeDto[];
}
