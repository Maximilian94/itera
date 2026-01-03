import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Skill} from '../../../api/api.types';
import {Observable} from 'rxjs';
import {environment} from '../../../../environments/environment';
import {SkillRepository} from '../domain/skill.interface';

@Injectable({
  providedIn: 'root',
})
export class SkillsHttp implements SkillRepository {
  private readonly baseUrl:string = environment.apiBaseUrl;
  private readonly http = inject(HttpClient);

  getAll$(): Observable<{ skills: Skill[] }> {
    return this.http.get<{ skills: Skill[] }>(`${this.baseUrl}/skills`);
  }
}

