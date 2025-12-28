import { IsOptional, IsUUID } from 'class-validator';

export class CreateAttemptDto {
  @IsOptional()
  @IsUUID()
  examId?: string;

  @IsUUID()
  questionId!: string;

  @IsUUID()
  selectedOptionId!: string;
}


