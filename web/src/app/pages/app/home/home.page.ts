import {CommonModule} from '@angular/common';
import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {type ExamResponse, ExamsService} from '../../../api/exams.service';
import type {Skill} from '../../../api/api.types';
import {PageHeader} from '../../../components/page-header/page-header';
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {faPlus} from '@fortawesome/free-solid-svg-icons';
import {ButtonComponent} from "../../../ui/button/button.component";
import {ChipComponent} from "../../../ui/chip/chip.component";
import {LINK} from '../../../app.routes';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeader,
    FontAwesomeModule,
    ButtonComponent,
    ChipComponent,
    RouterLink
],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  readonly skillsSig = signal<Skill[]>([]);
  readonly loadingSkillsSig = signal(false);
  readonly creatingSig = signal(false);
  readonly examSig = signal<ExamResponse | null>(null);
  readonly errorSig = signal<string | null>(null);
  protected readonly faPlus = faPlus;
  protected readonly LINK = LINK;
  // private readonly skillsApi = inject(SkillsService);
  private readonly examsApi = inject(ExamsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group({
    skillIds: this.fb.control<string[]>([]),
    onlyUnsolved: this.fb.control<boolean>(false),
    questionCount: this.fb.control<number>(10),
  });

  constructor() {
    this.loadSkills();
  }

  createExam() {
    this.errorSig.set(null);
    this.creatingSig.set(true);
    const value = this.form.getRawValue();

    this.examsApi
      .createExam$({
        skillIds: value.skillIds?.length ? value.skillIds : undefined,
        onlyUnsolved: value.onlyUnsolved ?? false,
        questionCount: value.questionCount ?? 10,
      })
      .pipe(finalize(() => this.creatingSig.set(false)))
      .subscribe({
        next: (res) => this.examSig.set(res),
        error: (e: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const msg = (e as any)?.error?.message;
          this.errorSig.set(typeof msg === 'string' ? msg : 'Falha ao criar prova');
        },
      });
  }

  async openQuestion(questionId: string) {
    const exam = this.examSig()?.exam;
    if (!exam) return;
    await this.router.navigateByUrl(`/app/exams/${exam.id}/questions/${questionId}`);
  }

  async startExam() {
    const first = this.examSig()?.questions?.[0];
    if (!first) return;
    await this.openQuestion(first.id);
  }

  private loadSkills() {
    this.loadingSkillsSig.set(true);
    // this.skillsApi
    //   .list$()
    //   .pipe(finalize(() => this.loadingSkillsSig.set(false)))
    //   .subscribe({
    //     next: (res) => this.skillsSig.set(res.skills),
    //     error: () => this.errorSig.set('Falha ao carregar skills'),
    //   });
  }
}
