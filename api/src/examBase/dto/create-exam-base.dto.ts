import { GovernmentScope } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

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

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minPassingGradeNonQuota?: string | null;

  @IsOptional()
  @IsUrl()
  editalUrl?: string | null;

  @IsOptional()
  @IsString()
  adminNotes?: string | null;

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
  registrationStart?: string | null;

  @IsOptional()
  @IsDateString()
  registrationEnd?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  workload?: string | null;

  /// Quando false, o cargo fica fora da página do concurso (ex.: Médico). Default true.
  @IsOptional()
  @IsBoolean()
  isNursingRelevant?: boolean;

  /// Agrupa esta prova com outras do MESMO cargo. null = cargo standalone.
  @IsOptional()
  @IsUUID()
  cargoGroupId?: string | null;

  /// Rótulo desta prova dentro do cargo (ex.: "Tipo 1", "Amarela").
  @IsOptional()
  @IsString()
  provaLabel?: string | null;

  /// Prova "representante" do cargo. Default true (cargo de 1 prova).
  @IsOptional()
  @IsBoolean()
  isPrimaryProva?: boolean;
}
