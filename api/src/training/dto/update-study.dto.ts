import { IsBoolean, IsString } from 'class-validator';

export class UpdateStudyDto {
  @IsString()
  subject: string;

  @IsBoolean()
  completed: boolean;
}
