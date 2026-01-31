import {Inject, Injectable, signal} from '@angular/core';
import {SKILL_REPOSITORY_TOKEN} from './domain/skill.interface';
import {SkillsHttp} from './data/skills-http';
import {finalize, take} from 'rxjs';
import {CreateSkill, SkillNode} from '@domain/skill/skill.interface';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private readonly _skillsSig = signal<SkillNode[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  public readonly skills = this._skillsSig.asReadonly();

  constructor(@Inject(SKILL_REPOSITORY_TOKEN) private repository: SkillsHttp) {}


  fetchSkills(){
    this._isLoading.update(() => true)

    this.repository.getAll$().pipe(take(1), finalize(() => {
      this._isLoading.update(() => false)
    })).subscribe((skillNode) => {
      this._skillsSig.set(skillNode)
    })
  }

  createSkill(createSkill: CreateSkill) : void {
    this.repository.create$(createSkill).pipe(take(1)).subscribe((skillNode) => {
      this._skillsSig.set(skillNode)
    })
  }
}
