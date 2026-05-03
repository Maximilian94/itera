import { Type } from 'class-transformer';
import { IsDefined, IsIn, ValidateNested } from 'class-validator';
import type {
  EstudandoConcurso,
  IntencaoConcurso,
  JaEnfermeiro,
  QualificacaoPayload,
  TrabalhaSaude,
} from '@domain/diagnostico/diagnostico.interface';

const JA_ENFERMEIRO: JaEnfermeiro[] = ['formado', 'em_formacao', 'nao'];
const TRABALHA_SAUDE: TrabalhaSaude[] = ['enfermeiro', 'outra_funcao', 'nao'];
const ESTUDANDO_CONCURSO: EstudandoConcurso[] = ['ativamente', 'pouco', 'nao'];
const INTENCAO_CONCURSO: IntencaoConcurso[] = ['3m', '6m', '12m', 'nao_decidiu'];

export class QualificacaoDto implements QualificacaoPayload {
  @IsIn(JA_ENFERMEIRO)
  jaEnfermeiro!: JaEnfermeiro;

  @IsIn(TRABALHA_SAUDE)
  trabalhaSaude!: TrabalhaSaude;

  @IsIn(ESTUDANDO_CONCURSO)
  estudandoConcurso!: EstudandoConcurso;

  @IsIn(INTENCAO_CONCURSO)
  intencaoConcurso!: IntencaoConcurso;
}

export class UpdateQualificacaoDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => QualificacaoDto)
  qualificacao!: QualificacaoDto;
}
