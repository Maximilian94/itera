import { IsUUID } from 'class-validator';

export class UpsertRetryAnswerDto {
  @IsUUID()
  questionId: string;

  @IsUUID()
  selectedAlternativeId: string;
}
