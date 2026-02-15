import { IsString } from 'class-validator';

export class CopyQuestionDto {
  @IsString()
  sourceExamBaseId: string;

  @IsString()
  sourceQuestionId: string;
}
