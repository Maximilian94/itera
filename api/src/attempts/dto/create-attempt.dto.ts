import { IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsString()
  optionSelectedId: string;
}
