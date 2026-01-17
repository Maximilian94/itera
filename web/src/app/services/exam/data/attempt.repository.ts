import {
  APIFinishExameRequest,
  APIExamResponse,
  ExamRepositoryInterface,
  AttemptsResponse,
} from '../domain/exam.interface';
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Uuid} from '../../../api/api.types';
import {Observable} from 'rxjs';
import {ExamResponse} from '../../../api/exams.service';
import {environment} from '../../../../environments/environment';
import {AttemptAnswer, Exam} from '@domain/exam/exam.interface';
import {AttemptRepositoryInterface} from '../domain/attempt.interface';

@Injectable({ providedIn: 'root' })
export class AttemptRepository implements AttemptRepositoryInterface {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  answerAttempt$(body: {
    attemptId: string;
    optionSelectedId: string;
  }) {
    return this.http.post<AttemptAnswer>(`${this.baseUrl}/attempts/answer`, body);
  }
}
