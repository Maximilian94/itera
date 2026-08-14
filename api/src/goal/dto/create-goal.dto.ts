import { IsString, MinLength } from 'class-validator';

export class CreateGoalDto {
  /**
   * Identidade do alvo da meta, resolvida na ordem: Cargo.slug | Cargo.id |
   * ExamBase.slug | ExamBase.id | Concurso.slug | Concurso.id. O último caso
   * ("Definir como meta" a partir do concurso) resolve para o cargo de
   * enfermagem representante do concurso.
   */
  @IsString()
  @MinLength(1)
  cargoSlug!: string;
}
