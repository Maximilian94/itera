import {ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, Signal} from '@angular/core';
import {SkillsService} from '../../../services/skills/skills';
import {TreeNode} from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import {CreateSkill} from '@domain/skill/skill.interface';
import {CreateSkillDialog} from '../../../components/create-skill-dialog/create-skill-dialog';
import {PageHeader} from '../../../components/page-header/page-header';
import {Button, ButtonIcon, ButtonLabel} from 'primeng/button';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTag} from '@fortawesome/free-solid-svg-icons';
import {transformSkillsToTreeNodes} from '../../../services/skills/utils/skills.utils';

@Component({
  selector: 'app-skills',
  imports: [TreeTableModule, CreateSkillDialog, PageHeader, Button, ButtonIcon, ButtonLabel, FaIconComponent],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Skills implements OnInit {
  protected readonly faTag = faTag;

  skillsService = inject(SkillsService);
  skills = this.skillsService.skills;
  treeNode: Signal<TreeNode[]> = this.computedValue();
  isDialogOpen = false;

  constructor(private cd: ChangeDetectorRef) {
  }


  ngOnInit() {
    this.skillsService.fetchSkills()
  }

  computedValue() {
    return computed(() => {
      const skills = this.skills();
      return transformSkillsToTreeNodes(skills)
    })
  }

  showDialog() {
    this.isDialogOpen = true;
    console.log(this.isDialogOpen);
    this.cd.markForCheck();
  }

  visibleChanged(b:boolean) {
    this.isDialogOpen = b;
  }

  createSkill(createSkill:CreateSkill) {
    this.skillsService.createSkill(createSkill)
  }
}
