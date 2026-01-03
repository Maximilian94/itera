import {Inject, Injectable, signal} from '@angular/core';
import {Skill} from '../../api/api.types';
import {toObservable} from '@angular/core/rxjs-interop';
import {SKILL_REPOSITORY_TOKEN} from './domain/skill.interface';
import {SkillsHttp} from './data/skills-http';
import {finalize, take} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkillsService {
  private readonly skillsSig = signal<Skill[]>([]);
  public skills$ = toObservable<Skill[]>(this.skillsSig);
  private readonly isLoading = signal<boolean>(false);

  constructor(@Inject(SKILL_REPOSITORY_TOKEN) private repository: SkillsHttp) {}


  fetchSkills(){
    this.isLoading.update(() => true)

    this.repository.getAll$().pipe(take(1), finalize(() => {
      this.isLoading.update(() => false)
    })).subscribe((res) => {
      this.skillsSig.update(() => res.skills)
    })
  }
}
