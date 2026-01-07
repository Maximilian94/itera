import {APIFinishExameRequest, ExamRepositoryInterface} from '../domain/exam.interface';
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Uuid} from '../../../api/api.types';
import {Observable} from 'rxjs';
import {ExamResponse} from '../../../api/exams.service';
import {environment} from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExamRepository implements ExamRepositoryInterface {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getExam$(examId:Uuid):Observable<ExamResponse> {
    return this.http.get<ExamResponse>(`${this.baseUrl}/exams/${examId}`);
  }

  finishExam$(examId:Uuid, answers: APIFinishExameRequest):Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exams/${examId}/finish`, answers);
  }

  startExam$(examId:Uuid):Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/exams/${examId}/start`, {});
  }
}
