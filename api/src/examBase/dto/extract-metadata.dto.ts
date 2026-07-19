import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ExtractMetadataDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class ExtractEditalDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'Informe uma URL válida (com http/https).' },
  )
  url: string;
}

/** Uma matéria do quadro de provas / conteúdo programático de um cargo. */
export interface ExtractedSyllabusGroup {
  name: string;
  topics?: string | null;
  questionCount?: number | null;
  weight?: string | null;
  maxScore?: string | null;
}

/** Ficha compacta de UM cargo na extração de edital completo. */
export interface ExtractedCargoFicha {
  role: string;
  salaryBase?: string | null;
  vacancyCount?: number | null;
  hasReserveList?: boolean | null;
  workload?: string | null;
  registrationFee?: string | null;
  minPassingGradeNonQuota?: string | null;
  requirements?: string | null;
  /** Descrição/atribuições — a IA só preenche para cargos de enfermagem. */
  description?: string | null;
  /** true apenas para cargos de enfermagem (Enfermeiro, Técnico/Auxiliar). */
  isNursingRelevant?: boolean | null;
  /** Quadro de matérias — a IA só preenche para cargos de enfermagem. */
  syllabusGroups?: ExtractedSyllabusGroup[];
}

/** Etapa/fase do certame (ex.: Prova Objetiva, Títulos, TAF). */
export interface ConcursoEtapa {
  name: string;
  description?: string | null;
  date?: string | null;
}

/** Extração de edital completo: dados do concurso + TODOS os cargos. */
export interface ExtractedEditalConcurso {
  name?: string | null;
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL';
  examDate?: string | null;
  institution?: string | null;
  state?: string | null;
  city?: string | null;
  examBoardName?: string | null;
  examBoardAlias?: string | null;
  editalUrl?: string | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  resultDate?: string | null;
  etapas?: ConcursoEtapa[];
  cargos?: ExtractedCargoFicha[];
}

export interface ExtractedExamMetadata {
  name?: string;
  role?: string;
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL';
  examDate?: string;
  institution?: string;
  state?: string;
  city?: string;
  salaryBase?: string;
  minPassingGradeNonQuota?: string;
  examBoardName?: string;
  examBoardAlias?: string;
  editalUrl?: string | null;
  vacancyCount?: number | null;
  applicantCount?: number | null;
  registrationFee?: string | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  resultDate?: string | null;
  description?: string | null;
  requirements?: string | null;
  workload?: string | null;
  hasReserveList?: boolean | null;
}
