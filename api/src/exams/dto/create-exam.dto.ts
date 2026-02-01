import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateExamDto {
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

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return undefined;
    const parsed = Number.parseInt(v.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  })
  @IsInt()
  @Min(1)
  questionCount?: number;
}
