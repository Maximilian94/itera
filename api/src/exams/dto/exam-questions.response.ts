export type ExamStatus = 'not_started' | 'in_progress' | 'finished';

export interface ExamDto {
  id: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  status: ExamStatus;
  questionCount: number;
}

export interface ExamQuestionOptionDto {
  id: string;
  text: string;
}

export interface ExamQuestionDto {
  id: string;
  statement: string;
  skillId: string;
  options: ExamQuestionOptionDto[];
}

export interface ExamQuestionsResponseDto {
  exam: ExamDto;
  questions: ExamQuestionDto[];
}
