import {ChangeDetectionStrategy, Component, effect, EventEmitter, inject, Input, Output} from '@angular/core';
import {FloatLabel} from 'primeng/floatlabel';
import {InputText} from 'primeng/inputtext';
import {FormsModule} from '@angular/forms';
import {TreeSelect} from 'primeng/treeselect';
import {SkillsService} from '../../services/skills/skills';
import {TreeNode} from 'primeng/api';
import {CreateSkill, SkillNode} from '@domain/skill/skill.interface';
import {Button} from 'primeng/button';
import {transformSkillsToTreeNodes} from '../../services/skills/utils/skills.utils';
import {Drawer} from 'primeng/drawer';

@Component({
  selector: 'app-create-skill-dialog',
  imports: [
    FloatLabel,
    InputText,
    FormsModule,
    TreeSelect,
    Button,
    Drawer
  ],
  templateUrl: './create-skill-dialog.html',
  styleUrl: './create-skill-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateSkillDialog {
  skillsService = inject(SkillsService);

  @Input({ required: true }) visible!: boolean;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() createSkill = new EventEmitter<CreateSkill>();

  skillName: string | undefined;
  selectedNodes: TreeNode | undefined = undefined;
  nodes!: TreeNode[];

  constructor() {
    effect(() => {
      const skills:SkillNode[] = this.skillsService.skills();
      this.nodes = transformSkillsToTreeNodes(skills);
    });
  }

  create(){
    if(!this.skillName) return;
    this.createSkill.emit({
      name: this.skillName,
      parentId: this.selectedNodes?.key || null
    });
  }
}
