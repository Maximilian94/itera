import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Skill } from './api.types';

@Injectable({ providedIn: 'root' })
export class SkillsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  list$(): Observable<{ skills: Skill[] }> {
    return this.http.get<{ skills: Skill[] }>(`${this.baseUrl}/skills`);
  }
}


