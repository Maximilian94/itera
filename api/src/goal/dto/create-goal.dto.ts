import { IsString, MinLength } from 'class-validator';

export class CreateGoalDto {
  /**
   * Identidade do cargo — mesmos fallbacks da página do cargo:
   * Cargo.slug | Cargo.id | ExamBase.slug | ExamBase.id.
   */
  @IsString()
  @MinLength(1)
  cargoSlug!: string;
}
