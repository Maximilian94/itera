import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { GovernmentScope } from '@prisma/client';

/**
 * Uma matéria do conteúdo programático / quadro de provas do cargo: nome +
 * tópicos (texto corrido) + os números do edital (nº de questões, peso,
 * pontuação máxima). Todos os números são opcionais — o edital nem sempre traz.
 */
export class ConcursoSyllabusGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  topics?: string | null;

  @IsOptional()
  @IsInt()
  questionCount?: number | null;

  @IsOptional()
  @IsDecimal()
  weight?: string | null;

  @IsOptional()
  @IsDecimal()
  maxScore?: string | null;
}

/** Ficha do cargo criada junto com o concurso (mesma forma do CreateCargoDto). */
export class CreateConcursoCargoDto {
  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  requirements?: string | null;

  @IsOptional()
  @IsDecimal()
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
  @IsDecimal()
  registrationFee?: string | null;

  @IsOptional()
  @IsDecimal()
  minPassingGradeNonQuota?: string | null;

  @IsOptional()
  @IsBoolean()
  isNursingRelevant?: boolean;

  /** Conteúdo programático + quadro de provas do cargo (matérias com números). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConcursoSyllabusGroupDto)
  syllabusGroups?: ConcursoSyllabusGroupDto[];
}

/** Etapa/fase do certame com data — monta o Cronograma (Prova, Títulos, TAF). */
export class ConcursoEtapaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  date?: string | null;
}

/** Documento publicado do concurso (edital, retificação, gabarito...) que
 *  alimenta a timeline de Notícias e o monitoramento futuro. */
export class ConcursoDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  kind?: string | null;

  @IsOptional()
  @IsDateString()
  publishedAt?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  sourceUrl?: string | null;
}

/**
 * Criação admin de Concurso direto do edital (fluxo do scraper de documentos):
 * o concurso nasce ANTES de qualquer prova — a ExamBase entra depois, pelo
 * wizard, e se liga a este concurso via find-or-create (mesma tupla única).
 */
export class CreateConcursoDto {
  @IsString()
  institution: string;

  @IsInt()
  year: number;

  @IsEnum(GovernmentScope)
  governmentScope: GovernmentScope;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsUUID()
  examBoardId?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  editalUrl?: string | null;

  @IsOptional()
  @IsDateString()
  registrationStart?: string | null;

  @IsOptional()
  @IsDateString()
  registrationEnd?: string | null;

  @IsOptional()
  @IsDateString()
  examDate?: string | null;

  @IsOptional()
  @IsDateString()
  resultDate?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConcursoEtapaDto)
  etapas?: ConcursoEtapaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConcursoDocumentDto)
  documents?: ConcursoDocumentDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateConcursoCargoDto)
  cargos: CreateConcursoCargoDto[];
}

/** Cargo no editor: `id` presente = atualizar; ausente = criar. */
export class UpdateConcursoCargoDto extends CreateConcursoCargoDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

/**
 * Edição de um concurso já criado (PATCH /concursos/:id): atualiza os campos do
 * concurso + etapas + a lista completa de cargos (upsert por id/role; cargos
 * sem prova que sumiram da lista são removidos).
 */
export class UpdateConcursoDto {
  @IsString()
  institution: string;

  @IsInt()
  year: number;

  @IsEnum(GovernmentScope)
  governmentScope: GovernmentScope;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsUUID()
  examBoardId?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  editalUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  documentsSourceUrl?: string | null;

  @IsOptional()
  @IsDateString()
  registrationStart?: string | null;

  @IsOptional()
  @IsDateString()
  registrationEnd?: string | null;

  @IsOptional()
  @IsDateString()
  examDate?: string | null;

  @IsOptional()
  @IsDateString()
  resultDate?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConcursoEtapaDto)
  etapas?: ConcursoEtapaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateConcursoCargoDto)
  cargos: UpdateConcursoCargoDto[];
}
