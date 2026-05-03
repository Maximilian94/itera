import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { AttributionData } from '@domain/diagnostico/diagnostico.interface';

/**
 * Attribution payload (first-touch). Tudo opcional: lead vindo direto sem
 * UTMs nem fbclid também é aceito (cai em tag `direct`).
 */
export class AttributionDto implements AttributionData {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  fbclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  landingPage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fbp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fbc?: string;
}
