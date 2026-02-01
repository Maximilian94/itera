import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateExamBaseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  examBoardId?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsString()
  role: string;

  @IsDateString()
  examDate: string;
}

