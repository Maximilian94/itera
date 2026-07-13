import {
  IsBoolean,
  IsDecimal,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCargoDto {
  @IsUUID()
  concursoId: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  slug?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  salaryBase?: string | null;

  @IsOptional()
  @IsString()
  workload?: string | null;

  @IsOptional()
  @IsInt()
  vacancyCount?: number | null;

  @IsOptional()
  @IsBoolean()
  hasReserveList?: boolean;

  @IsOptional()
  @IsInt()
  applicantCount?: number | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  registrationFee?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minPassingGradeNonQuota?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  actualCutScore?: string | null;

  @IsOptional()
  @IsBoolean()
  isNursingRelevant?: boolean;
}

export class UpdateCargoDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  slug?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  salaryBase?: string | null;

  @IsOptional()
  @IsString()
  workload?: string | null;

  @IsOptional()
  @IsInt()
  vacancyCount?: number | null;

  @IsOptional()
  @IsBoolean()
  hasReserveList?: boolean;

  @IsOptional()
  @IsInt()
  applicantCount?: number | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  registrationFee?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minPassingGradeNonQuota?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  actualCutScore?: string | null;

  @IsOptional()
  @IsBoolean()
  isNursingRelevant?: boolean;
}

export class LinkProvaDto {
  /** Rótulo desta prova dentro do cargo (ex.: "Tipo 1", "Amarela"). */
  @IsOptional()
  @IsString()
  provaLabel?: string | null;

  /** Já vincula como a prova oficial (rebaixa a atual em transação). */
  @IsOptional()
  @IsBoolean()
  isOficial?: boolean;
}

export class UpdateProvaLinkDto {
  @IsOptional()
  @IsString()
  provaLabel?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ListCargosQueryDto {
  @IsOptional()
  @IsUUID()
  concursoId?: string;
}
