import { IsOptional, IsString } from 'class-validator';

export class UpdateExamBoardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
