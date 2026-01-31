import {
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  inject,
  Output,
  Signal,
  signal
} from '@angular/core';
import {Button, ButtonIcon, ButtonLabel} from "primeng/button";
import {Checkbox} from "primeng/checkbox";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {FloatLabel} from "primeng/floatlabel";
import {InputNumber} from "primeng/inputnumber";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {faMinus, faPlay, faPlus, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import type {Skill} from '../../api/api.types';
import {ExamsService} from '../../api/exams.service';
import {SkillsService} from '../../services/skills/skills';
import {finalize, Observable} from 'rxjs';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {Tooltip} from 'primeng/tooltip';
import {Message} from 'primeng/message';
import {CapitalizePipe} from '../../pipes/capitalize-pipe';
import {SkillNode} from '@domain/skill/skill.interface';
import {TreeSelect} from 'primeng/treeselect';
import {TreeNode} from 'primeng/api';
import {transformSkillsToTreeNodes} from '../../services/skills/utils/skills.utils';

@Component({
  selector: 'app-create-exam-form',
  imports: [
      Button,
      Checkbox,
      FaIconComponent,
      FloatLabel,
      InputNumber,
      ReactiveFormsModule,
    Tooltip,
    ButtonIcon,
    ButtonLabel,
    Message,
    CapitalizePipe,
    TreeSelect,
    FormsModule
  ],
  templateUrl: './create-exam-form.html',
  styleUrl: './create-exam-form.scss',
})
export class CreateExamForm {
  protected readonly faPlay = faPlay;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  readonly form = new FormGroup({
    skills: new FormControl<TreeNode<Skill>[] | null>([], { nonNullable: true }),
    onlyUnsolved: new FormControl<boolean>(false, { nonNullable: true }),
    questionCount: new FormControl<number>(10, { nonNullable: true }),
  });
  readonly loadingSig = signal(false);
  readonly errorSig = signal<string | null>(null);
  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
  private readonly skillsService = inject(SkillsService);
  readonly skills$: Observable<SkillNode[]> = toObservable(this.skillsService.skills);
  private readonly examsApi = inject(ExamsService);
  private readonly allSkillsSig = signal<Skill[]>([]);

  isCreateExamBtnDisabled: boolean = true;

  skillsOptions:Signal<TreeNode[]> = this.computedSkillsOptions();

  @Output() examCreated = new EventEmitter<string>();

  constructor(private cd: ChangeDetectorRef) {
    this.skillsService.fetchSkills();

    this.skills$
      .pipe(takeUntilDestroyed())
      .subscribe((skills) => this.allSkillsSig.set(skills));

    this.form.controls["skills"].valueChanges.subscribe((value) => {
      this.isCreateExamBtnDisabled = !(value && value.length > 0);

      console.log(this.isCreateExamBtnDisabled);
      this.cd.detectChanges();
    })
  }

  createExam() {
    this.errorSig.set(null);
    this.loadingSig.set(true);

    const { onlyUnsolved, questionCount, skills } = this.form.getRawValue();

    // TODO -> Handle Error
    if (!skills) return;
    const selectedSkills :string[] = skills
      .map((skill) => skill.data?.id)
      .filter((s) => s !== undefined);

    this.examsApi
      .createExam$({
        skillIds: selectedSkills,
        onlyUnsolved: onlyUnsolved ?? false,
        questionCount: questionCount ?? 10,
      })
      .pipe(finalize(() => this.loadingSig.set(false)))
      .subscribe({
        next: (res) => {
          this.examCreated.next(res.exam.id);
        },
        error: (res) => {
          this.errorSig.set(res?.error?.message || "Error")
        }
      });
  }

  private computedSkillsOptions():Signal<TreeNode[]> {
    return computed(() => {
      const skills:SkillNode[] = this.skillsService.skills();
      return transformSkillsToTreeNodes(skills);
    })
  }
}
