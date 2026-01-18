import { IsString, ValidateIf } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  name: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentId: string | null;
}
