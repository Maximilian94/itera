import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateExamBoardDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsString()
  logoUrl: string;
}
