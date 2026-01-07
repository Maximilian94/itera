import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class FinishExamAnswerDto {
  @IsUUID('4', { message: 'questionId must be a valid UUID' })
  questionId!: string;

  @IsUUID('4', { message: 'selectedOptionId must be a valid UUID' })
  selectedOptionId!: string;
}

export class FinishExamDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinishExamAnswerDto)
  answers?: FinishExamAnswerDto[];
}
