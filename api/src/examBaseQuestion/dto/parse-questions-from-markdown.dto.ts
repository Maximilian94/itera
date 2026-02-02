import { IsString } from 'class-validator';

export class ParseQuestionsFromMarkdownDto {
  @IsString()
  markdown: string;
}
