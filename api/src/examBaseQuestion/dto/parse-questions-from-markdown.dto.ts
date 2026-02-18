import { IsIn, IsOptional, IsString } from 'class-validator';

export class ParseQuestionsFromMarkdownDto {
  @IsString()
  markdown: string;

  @IsOptional()
  @IsIn(['grok', 'chatgpt'])
  provider?: 'grok' | 'chatgpt';
}
