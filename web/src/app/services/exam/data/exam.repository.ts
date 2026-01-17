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

@Injectable({ providedIn: 'root' })
export class ExamRepository implements ExamRepositoryInterface {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getExam$(examId:Uuid):Observable<ExamResponse> {
    return this.http.get<ExamResponse>(`${this.baseUrl}/exams/${examId}`);
  }

  getExamV2$(examId:Uuid):Observable<Exam> {
    return this.http.get<Exam>(`${this.baseUrl}/exams/v2/${examId}`);
  }

  finishExam$(examId:Uuid, answers: APIFinishExameRequest):Observable<APIExamResponse> {
    return this.http.post<APIExamResponse>(`${this.baseUrl}/exams/${examId}/finish`, answers);
  }

  startExam$(examId:Uuid):Observable<Exam> {
    return this.http.post<Exam>(`${this.baseUrl}/exams/${examId}/start`, {});
  }

  getAttempts$(examId:Uuid):Observable<AttemptsResponse[]> {
    return this.http.get<AttemptsResponse[]>(`${this.baseUrl}/attempts?examId=${examId}`);
  }

  getAttemptsV2$(examId:Uuid):Observable<AttemptAnswer[]> {
    return this.http.get<AttemptAnswer[]>(`${this.baseUrl}/attempts/v2?examId=${examId}`);
  }
}
