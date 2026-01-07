import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';

export interface ExamRepositoryInterface {
  getExam$(examId: Uuid): Observable<APIExamResponse>;
  finishExam$(examId: Uuid, answers: APIFinishExameRequest): Observable<void>;
  startExam$(examId: Uuid): Observable<void>;
}

export type Uuid = string;

export interface APIExamResponse {
  exam: APIExam;
  questions: APIQuestion[];
}

export interface APIExam {
  id: Uuid;
  createdAt: string;
  questionCount: number;
}

export interface APIQuestion {
  id: Uuid;
  statement: string;
  skillId: Uuid;
  options: APIQuestionOption[];
}

export interface APIQuestionOption {
  id: Uuid;
  text: string;
}

export interface APIFinishExameRequest {
  answers: APIFinishExameAnswerRequest[];
}

export interface APIFinishExameAnswerRequest {
  questionId: Uuid;
  selectedOptionId: Uuid;
}



export const EXAM_REPOSITORY_TOKEN = new InjectionToken<ExamRepositoryInterface>("EXAM_REPOSITORY_TOKEN");
