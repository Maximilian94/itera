import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateExamBaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  examBoardId?: string | null;

  @IsOptional()
  @IsString()
  institution?: string | null;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;
}

