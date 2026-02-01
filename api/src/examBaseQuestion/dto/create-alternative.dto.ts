import { IsString } from 'class-validator';

/**
 * Example payload: { "key": "A", "text": "Option A text", "explanation": "Why A is correct/incorrect" }
 */
export class CreateAlternativeDto {
  @IsString()
  key: string;

  @IsString()
  text: string;

  @IsString()
  explanation: string;
}
