import { IsString } from 'class-validator';

export class CreateExamBoardDto {
  @IsString()
  name: string;

  @IsString()
  logoUrl: string;
}
