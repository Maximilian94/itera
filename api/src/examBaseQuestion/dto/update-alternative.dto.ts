import { IsOptional, IsString } from 'class-validator';

/**
 * Example payload: { "key": "A", "text": "Updated text", "explanation": "Updated explanation" }
 * All fields optional (partial update).
 */
export class UpdateAlternativeDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}
