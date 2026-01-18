import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {SkillRepository} from '../domain/skill.interface';
import {CreateSkill, SkillNode} from '@domain/skill/skill.interface';

@Injectable({
  providedIn: 'root',
})
export class SkillsHttp implements SkillRepository {
  private readonly baseUrl:string = environment.apiBaseUrl;
  private readonly http = inject(HttpClient);

  getAll$(): Observable<SkillNode[]> {
    return this.http.get<SkillNode[]>(`${this.baseUrl}/skills`);
  }

  create$(createSkill:CreateSkill):Observable<SkillNode[]> {
    return this.http.post<SkillNode[]>(`${this.baseUrl}/skills`, createSkill);
  }
}

