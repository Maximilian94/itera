import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type {
  Alternativa,
  DiagnosticoSubmissionPayload,
} from '@domain/diagnostico/diagnostico.interface';
import { AttributionDto } from './attribution.dto';
import { DiagnosticoResultadoDto } from './diagnostico-resultado.dto';

const ALTERNATIVAS: Alternativa[] = ['A', 'B', 'C', 'D'];

/**
 * Valida que `respostas` é um objeto plano cujos valores ∈ {A,B,C,D}.
 * Não valida que tem 10 entradas — a quantidade pode mudar; perguntas vivem no front.
 */
function isValidRespostas(value: unknown): value is Record<string, Alternativa> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(
    ([k, v]) =>
      typeof k === 'string' &&
      k.length > 0 &&
      typeof v === 'string' &&
      ALTERNATIVAS.includes(v as Alternativa),
  );
}

export class SubmitDiagnosticoDto implements DiagnosticoSubmissionPayload {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsIn(['edital', 'plantao', 'wizard_direto'])
  fonteLp!: string;

  @IsObject()
  @IsNotEmptyObject()
  respostas!: Record<string, Alternativa>;

  @ValidateNested()
  @Type(() => DiagnosticoResultadoDto)
  resultado!: DiagnosticoResultadoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionDto)
  attribution?: AttributionDto;

  @IsUUID()
  eventId!: string;

  @IsBoolean()
  consentMarketing!: boolean;

  /** Sanity check chamado pelo controller; class-validator não valida shape de Record genérico. */
  static validateRespostas(dto: SubmitDiagnosticoDto): boolean {
    return isValidRespostas(dto.respostas);
  }
}
