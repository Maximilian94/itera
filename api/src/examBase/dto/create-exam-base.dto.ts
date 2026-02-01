import { GovernmentScope } from '@prisma/client';
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsEnum(GovernmentScope)
  governmentScope: GovernmentScope;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  // keep as string so we don't lose precision in JSON/JS numbers
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  salaryBase?: string | null;

  @IsDateString()
  examDate: string;
}

