import {Uuid} from '../../../api/api.types';
import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';

export interface Skill {
  id: Uuid;
  name: string;
}

export interface SkillRepository {
  getAll$(): Observable<{ skills: Skill[] }>
}

export const SKILL_REPOSITORY_TOKEN = new InjectionToken<SkillRepository>('SKILL_REPOSITORY_TOKEN')
