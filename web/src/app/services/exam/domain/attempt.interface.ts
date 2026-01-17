import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';
import {AttemptAnswer} from "@domain/exam/exam.interface";

export interface AttemptRepositoryInterface {
  answerAttempt$(body: {
    attemptId: string;
    optionSelectedId: string;
  }): Observable<AttemptAnswer>;
}


export const ATTEMPT_REPOSITORY_TOKEN = new InjectionToken<AttemptRepositoryInterface>("ATTEMPT_REPOSITORY_TOKEN");
