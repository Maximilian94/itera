import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateAttemptDto {
  @IsOptional()
  @IsUUID()
  examId?: string;

  @IsUUID()
  questionId!: string;

  @IsUUID()
  selectedOptionId!: string;
}

export class AnswerAttemptDto {
  @IsString()
  attemptId: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  optionSelectedId: string;
}
