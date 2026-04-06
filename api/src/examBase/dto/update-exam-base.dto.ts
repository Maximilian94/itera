import { GovernmentScope, ProcessingPhase } from '@prisma/client';
import { IsDateString, IsDecimal, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

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
  @IsEnum(GovernmentScope)
  governmentScope?: GovernmentScope;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  salaryBase?: string | null;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minPassingGradeNonQuota?: string | null;

  @IsOptional()
  @IsString()
  slug?: string | null;

  @IsOptional()
  @IsUrl()
  editalUrl?: string | null;

  @IsOptional()
  @IsString()
  adminNotes?: string | null;

  @IsOptional()
  @IsEnum(ProcessingPhase)
  processingPhase?: ProcessingPhase;

  @IsOptional()
  @IsInt()
  vacancyCount?: number | null;

  @IsOptional()
  @IsInt()
  applicantCount?: number | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  registrationFee?: string | null;

  @IsOptional()
  @IsDateString()
  registrationDate?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  workload?: string | null;
}

