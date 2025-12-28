import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Attempt, AttemptFeedback, Uuid } from './api.types';

export interface CreateAttemptInput {
  examId?: Uuid;
  questionId: Uuid;
  selectedOptionId: Uuid;
}

export interface CreateAttemptResponse {
  attempt: Attempt;
  feedback: AttemptFeedback;
}

@Injectable({ providedIn: 'root' })
export class AttemptsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createAttempt$(input: CreateAttemptInput): Observable<CreateAttemptResponse> {
    return this.http.post<CreateAttemptResponse>(`${this.baseUrl}/attempts`, input);
  }
}


