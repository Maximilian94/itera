import { GovernmentScope } from '@prisma/client';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateSlugDto {
  @IsOptional()
  @IsUUID()
  examBoardId?: string;

  @IsOptional()
  @IsString()
  institution?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsDateString()
  examDate: string;

  @IsString()
  role: string;

  /** When editing, pass current slug to exclude from uniqueness check. */
  @IsOptional()
  @IsString()
  excludeSlug?: string | null;
}
