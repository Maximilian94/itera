import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  DiagnosticoResultado,
  ProfileSlug,
  ScoreSecundario,
  SecondaryScoreCategoria,
} from '@domain/diagnostico/diagnostico.interface';

const PROFILE_SLUGS: ProfileSlug[] = [
  'sobrecarregado',
  'esforcado_sem_direcao',
  'em_evolucao',
  'estrategico',
];

const SECONDARY_CATEGORIAS: SecondaryScoreCategoria[] = [
  'clarezaDirecao',
  'consistencia',
  'qualidadeMetodo',
  'retencao',
];

export class PerfilDto {
  @IsIn(PROFILE_SLUGS)
  slug!: ProfileSlug;

  @IsString()
  nome!: string;

  @IsString()
  mensagemPrincipal!: string;
}

export class ScoreSecundarioDto implements ScoreSecundario {
  @IsIn(SECONDARY_CATEGORIAS)
  categoria!: SecondaryScoreCategoria;

  @IsInt()
  @Min(0)
  score!: number;

  @IsInt()
  @Min(1)
  maxScore!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class DiagnosticoResultadoDto implements DiagnosticoResultado {
  @IsInt()
  @Min(0)
  @Max(30)
  totalScore!: number;

  @ValidateNested()
  @Type(() => PerfilDto)
  perfil!: PerfilDto;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ScoreSecundarioDto)
  scores!: ScoreSecundarioDto[];

  @ValidateNested()
  @Type(() => ScoreSecundarioDto)
  pontoForte!: ScoreSecundarioDto;

  @ValidateNested()
  @Type(() => ScoreSecundarioDto)
  pontoAtencao!: ScoreSecundarioDto;

  @IsString()
  proximoPasso!: string;
}
