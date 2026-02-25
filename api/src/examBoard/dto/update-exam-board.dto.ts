import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateExamBoardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
