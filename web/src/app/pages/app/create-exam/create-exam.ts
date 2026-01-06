import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {finalize, Observable} from 'rxjs';
import {CommonModule} from '@angular/common';
import {AutoCompleteCompleteEvent, AutoCompleteModule} from 'primeng/autocomplete';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputNumberModule} from 'primeng/inputnumber';
import {TooltipModule} from 'primeng/tooltip';

import {PageHeader} from '../../../components/page-header/page-header';
import {type Skill} from '../../../api/api.types';
import {type ExamResponse, ExamsService} from '../../../api/exams.service';
import {SkillsService} from '../../../services/skills/skills';
import {FloatLabel} from 'primeng/floatlabel';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';
import {Card} from 'primeng/card';


@Component({
  selector: 'app-create-exam',
  imports: [
    CommonModule,
    PageHeader,
    ReactiveFormsModule,
    AutoCompleteModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    TooltipModule,
    FloatLabel,
    FaIconComponent,
    Card,
  ],
  templateUrl: './create-exam.html',
  styleUrl: './create-exam.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExam {
  readonly form = new FormGroup({
    skills: new FormControl<Skill[]>([], { nonNullable: true }),
    onlyUnsolved: new FormControl<boolean>(false, { nonNullable: true }),
    questionCount: new FormControl<number>(10, { nonNullable: true }),
  });
  readonly loadingSig = signal(false);
  readonly errorSig = signal<string | null>(null);
  readonly examSig = signal<ExamResponse | null>(null);
  readonly suggestionsSig = signal<Skill[]>([]);
  readonly selectedSkillsSig = signal<Skill[]>([]);
  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
  private readonly skillsService = inject(SkillsService);
  readonly skills$: Observable<Skill[]> = this.skillsService.skills$;
  private readonly examsApi = inject(ExamsService);
  private readonly allSkillsSig = signal<Skill[]>([]);
  private readonly lastQuerySig = signal<string>('');
  protected readonly disableCreateExam = computed(() =>
    this.loadingSig() || this.selectedSkillsSig().length === 0
  );

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
  }

  search(event: AutoCompleteCompleteEvent) {
    const q = (event.query ?? '').trim().toLowerCase();
    this.lastQuerySig.set(q);
    this.recomputeSuggestions();
  }

  createExam() {
    this.errorSig.set(null);
    this.examSig.set(null);
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
          this.examSig.set(res);
        },
        error: () => this.errorSig.set('Failed to create exam'),
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
