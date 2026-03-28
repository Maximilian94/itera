import { IsOptional, IsString } from 'class-validator';

export class ExtractMetadataDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export type ExtractedExamMetadata = {
  name?: string;
  role?: string;
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL';
  examDate?: string;
  institution?: string;
  state?: string;
  city?: string;
  salaryBase?: string;
  minPassingGradeNonQuota?: string;
  examBoardName?: string;
  examBoardAlias?: string;
  editalUrl?: string | null;
};
