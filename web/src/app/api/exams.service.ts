import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Exam, Question, Uuid } from './api.types';

export interface CreateExamInput {
  skillIds?: Uuid[];
  onlyUnsolved?: boolean;
  questionCount?: number;
}

export interface ExamResponse {
  exam: Exam;
  questions: Question[];
}

@Injectable({ providedIn: 'root' })
export class ExamsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createExam$(input: CreateExamInput): Observable<ExamResponse> {
    return this.http.post<ExamResponse>(`${this.baseUrl}/exams`, input);
  }

  getExam$(examId: Uuid): Observable<ExamResponse> {
    return this.http.get<ExamResponse>(`${this.baseUrl}/exams/${examId}`);
  }
}


