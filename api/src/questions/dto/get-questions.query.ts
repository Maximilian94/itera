import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GetQuestionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    const raw = Array.isArray(value) ? value : [value];
    return raw
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  })
  @IsUUID(undefined, { each: true })
  skillIds?: string[];

  @IsOptional()
  /**
   * When true, returns only questions the user has attempted AND has not solved yet
   * (i.e. no correct attempts so far). This supports the iteration loop:
   * “home what I still get wrong”.
   *
   * In query string:
   * - `?onlyUnsolved=true`
   */
  @Transform(({ value }) => {
    if (value == null) return undefined;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v !== 'string') return undefined;
    const lowered = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lowered)) return true;
    if (['false', '0', 'no', 'n'].includes(lowered)) return false;
    return undefined;
  })
  @IsBoolean()
  onlyUnsolved?: boolean;
}
