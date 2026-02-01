import { IsOptional, IsUUID } from 'class-validator';

export class GetExamBasesQueryDto {
  @IsOptional()
  @IsUUID()
  examBoardId?: string;
}

