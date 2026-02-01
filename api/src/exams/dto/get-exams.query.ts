import { IsOptional, IsUUID } from 'class-validator';

export class GetExamsQueryDto {
  @IsOptional()
  @IsUUID()
  examBoardId?: string;
}

