import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSyllabusGroupDto {
  @IsString()
  name: string;

  @IsString()
  topics: string;

  /// Posição de exibição (0-based). Quando omitido, vai para o fim da lista.
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateSyllabusGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  topics?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderSyllabusGroupsDto {
  /// Ids de TODOS os grupos da prova, na nova ordem de exibição.
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
