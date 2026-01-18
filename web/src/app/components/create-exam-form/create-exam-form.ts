import { Component, computed, effect, EventEmitter, inject, Output, signal} from '@angular/core';
import {AutoCompleteCompleteEvent} from "primeng/autocomplete";
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
    skills: new FormControl<Skill[]>([], { nonNullable: true }),
    onlyUnsolved: new FormControl<boolean>(false, { nonNullable: true }),
    questionCount: new FormControl<number>(10, { nonNullable: true }),
  });
  readonly loadingSig = signal(false);
  readonly errorSig = signal<string | null>(null);
  readonly suggestionsSig = signal<Skill[]>([]);
  readonly selectedSkillsSig = signal<Skill[]>([]);
  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
  private readonly skillsService = inject(SkillsService);
  readonly skills$: Observable<SkillNode[]> = toObservable(this.skillsService.skills);
  private readonly examsApi = inject(ExamsService);
  private readonly allSkillsSig = signal<Skill[]>([]);
  private readonly lastQuerySig = signal<string>('');
  protected readonly disableCreateExam = computed(() =>
    this.loadingSig() || this.selectedSkillsSig().length === 0
  );

  skillsOptions:TreeNode[] = [];

  @Output() examCreated = new EventEmitter<string>();

  constructor() {
    this.skillsService.fetchSkills();

    this.skills$
      .pipe(takeUntilDestroyed())
      .subscribe((skills) => this.allSkillsSig.set(skills));

    // Recompute suggestions when selection changes so we don't show already-selected items.
    this.form.controls.skills.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedSkillsSig.set(value ?? []);
      this.recomputeSuggestions();
    });

    // Ensure initial state is consistent (e.g. if form is prefilled later).
    this.selectedSkillsSig.set(this.form.controls.skills.value ?? []);

    effect(() => {
      const skills:SkillNode[] = this.skillsService.skills();
      this.skillsOptions = transformSkillsToTreeNodes(skills);
    });
  }

  search(event: AutoCompleteCompleteEvent) {
    const q = (event.query ?? '').trim().toLowerCase();
    this.lastQuerySig.set(q);
    this.recomputeSuggestions();
  }

  createExam() {
    this.errorSig.set(null);
    this.loadingSig.set(true);

    const { onlyUnsolved, questionCount } = this.form.getRawValue();
    const skills = this.selectedSkillsSig();

    this.examsApi
      .createExam$({
        skillIds: skills?.length ? skills.map((s) => s.id) : undefined,
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

  private recomputeSuggestions() {
    const q = this.lastQuerySig();
    const selected = new Set(this.selectedSkillsSig().map((s) => s.id));
    const all = this.allSkillsSig().filter((s) => !selected.has(s.id));

    this.suggestionsSig.set(
      q ? all.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 20) : all.slice(0, 20),
    );
  }
}
