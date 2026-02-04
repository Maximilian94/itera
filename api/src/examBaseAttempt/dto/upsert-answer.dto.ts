import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpsertAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  selectedAlternativeId?: string | null;
}
