import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';
import { AttemptsService } from '../../../api/attempts.service';
import { ExamsService } from '../../../api/exams.service';
import type { AttemptFeedback, Question } from '../../../api/api.types';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-question-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question.page.html',
  styleUrls: ['./question.page.scss'],
})
export class QuestionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examsApi = inject(ExamsService);
  private readonly attemptsApi = inject(AttemptsService);

  readonly loadingSig = signal(true);
  readonly submittingSig = signal(false);
  readonly errorSig = signal<string | null>(null);

  readonly examIdSig = signal<string>('');
  readonly questionIdSig = signal<string>('');

  readonly questionsSig = signal<Question[]>([]);
  readonly selectedOptionIdSig = signal<string | null>(null);
  readonly feedbackSig = signal<AttemptFeedback | null>(null);

  readonly questionSig = computed(() => {
    const id = this.questionIdSig();
    return this.questionsSig().find((q) => q.id === id) ?? null;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => ({
          examId: p.get('examId') ?? '',
          questionId: p.get('questionId') ?? '',
        })),
        switchMap(({ examId, questionId }) => {
          this.examIdSig.set(examId);
          this.questionIdSig.set(questionId);
          this.loadingSig.set(true);
          this.errorSig.set(null);
          this.feedbackSig.set(null);
          this.selectedOptionIdSig.set(null);
          return this.examsApi.getExam$(examId).pipe(finalize(() => this.loadingSig.set(false)));
        }),
      )
      .subscribe({
        next: (res) => {
          this.questionsSig.set(res.questions);
          if (!this.questionSig()) this.errorSig.set('Questão não encontrada nesta prova');
        },
        error: () => this.errorSig.set('Falha ao carregar prova'),
      });
  }

  submit() {
    const q = this.questionSig();
    const selected = this.selectedOptionIdSig();
    if (!q || !selected) return;

    this.submittingSig.set(true);
    this.errorSig.set(null);

    this.attemptsApi
      .createAttempt$({
        examId: this.examIdSig(),
        questionId: q.id,
        selectedOptionId: selected,
      })
      .pipe(finalize(() => this.submittingSig.set(false)))
      .subscribe({
        next: (res) => this.feedbackSig.set(res.feedback),
        error: () => this.errorSig.set('Falha ao enviar resposta'),
      });
  }

  async next() {
    const examId = this.examIdSig();
    const currentId = this.questionIdSig();
    const questions = this.questionsSig();
    const idx = questions.findIndex((q) => q.id === currentId);
    const nextQ = idx >= 0 ? questions[idx + 1] : undefined;
    if (!nextQ) {
      await this.router.navigateByUrl('/app');
      return;
    }
    await this.router.navigateByUrl(`/app/exams/${examId}/questions/${nextQ.id}`);
  }
}


