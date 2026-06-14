import { GovernmentScope, ProcessingPhase } from '@prisma/client';
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

  /// Quando false, o cargo fica fora da página do concurso (ex.: Médico).
  @IsOptional()
  @IsBoolean()
  isNursingRelevant?: boolean;

  /// Agrupa esta prova com outras do MESMO cargo (cargoGroupId compartilhado).
  /// null/ausente = cargo standalone (1 prova = 1 cargo).
  @IsOptional()
  @IsUUID()
  cargoGroupId?: string | null;

  /// Rótulo desta prova dentro do cargo (ex.: "Tipo 1", "Amarela").
  @IsOptional()
  @IsString()
  provaLabel?: string | null;

  /// Prova "representante" do cargo (carrega ficha/edital/conteúdo e slug).
  /// Ao marcar true, o service desmarca as irmãs do mesmo cargoGroupId.
  @IsOptional()
  @IsBoolean()
  isPrimaryProva?: boolean;
}
