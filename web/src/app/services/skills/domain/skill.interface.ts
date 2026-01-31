import {Observable} from 'rxjs';
import {InjectionToken} from '@angular/core';
import {CreateSkill, SkillNode} from '@domain/skill/skill.interface';

export interface SkillRepository {
  getAll$(): Observable<SkillNode[]>,
  create$(createSkill:CreateSkill): Observable<SkillNode[]>,
}

export const SKILL_REPOSITORY_TOKEN = new InjectionToken<SkillRepository>('SKILL_REPOSITORY_TOKEN')
