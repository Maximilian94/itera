import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';
import {AttemptAnswer, Exam } from "@domain/exam/exam.interface";

export interface ExamRepositoryInterface {
  getExam$(examId: Uuid): Observable<APIExamResponse>;
  getExamV2$(examId: Uuid): Observable<Exam>;
  getAttempts$(examId: Uuid): Observable<AttemptsResponse[]>;
  getAttemptsV2$(examId: Uuid): Observable<AttemptAnswer[]>;
  finishExam$(examId: Uuid, answers: APIFinishExameRequest): Observable<APIExamResponse>;
  startExam$(examId: Uuid): Observable<Exam>;
}

export interface AttemptsInProgressResponse {
  questionId: Uuid;
  selectedOptionId: Uuid | null;
  isCorrect: undefined;
  correctOptionId: null;
}

export interface AttemptsResponse {
  questionId: Uuid;
  selectedOptionId: Uuid | null;
  isCorrect: boolean;
  correctOptionId: Uuid;
}

export type Uuid = string;

export interface APIExam {
  createdAt: string;
  finishedAt: string | null;
  id: Uuid;
  questionCount: number;
  startedAt: string | null;
  status: 'not_started' | 'in_progress' | 'finished';
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

export interface APIExamResponse {
  exam: APIExam;
  questions: APIQuestion[];
}

export interface APIFinishExameRequest {
  answers: APIFinishExameAnswerRequest[];
}

export interface APIFinishExameAnswerRequest {
  questionId: Uuid;
  selectedOptionId: Uuid;
}



export const EXAM_REPOSITORY_TOKEN = new InjectionToken<ExamRepositoryInterface>("EXAM_REPOSITORY_TOKEN");
