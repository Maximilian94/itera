import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { CareerStage, ExamHorizon, PreferenceMobility } from '@prisma/client';

/** Buckets that anchor the search on a city (travel-time budget). */
export const CITY_SCOPED_MOBILITIES: PreferenceMobility[] = [
  PreferenceMobility.MAX_30MIN,
  PreferenceMobility.MAX_1H,
  PreferenceMobility.MAX_2H,
];

/**
 * Full preference document — the form always sends every field (PUT upsert).
 * The anchor is conditional on the search scope (`mobility`):
 * - MAX_* (city + travel budget) → state and city required;
 * - STATE (whole state)          → state required, city ignored;
 * - ANYWHERE (nationwide)        → both ignored.
 * `minSalary` is the only always-optional answer; null/undefined clears it.
 */
export class UpsertPreferenceDto {
  /** UF (sigla, ex.: "SP"). Required unless mobility = ANYWHERE. */
  @ValidateIf((o: UpsertPreferenceDto) => o.mobility !== PreferenceMobility.ANYWHERE)
  @IsString()
  @Length(2, 2)
  state?: string | null;

  /** Municipality name (IBGE) — the search anchor. Required only for MAX_* scopes. */
  @ValidateIf((o: UpsertPreferenceDto) =>
    CITY_SCOPED_MOBILITIES.includes(o.mobility),
  )
  @IsString()
  @IsNotEmpty()
  city?: string | null;

  @IsEnum(PreferenceMobility)
  mobility: PreferenceMobility;

  @IsEnum(CareerStage)
  careerStage: CareerStage;

  /** Minimum acceptable salary in BRL. Null/absent = no constraint. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number | null;

  @IsEnum(ExamHorizon)
  horizon: ExamHorizon;
}
