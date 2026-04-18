import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

const ABANDONMENT_THRESHOLD_HOURS = 24;

/**
 * Hourly sweep that marks idle-past-threshold attempts as abandoned and
 * emits the exam_abandoned analytics event once per attempt. Without this,
 * the funnel can't distinguish "user is still working" from "user rage-quit
 * and never came back" — exam_finished from the client gets lost on
 * tab-close so we need a backend-driven terminal state.
 */
@Injectable()
export class ExamAbandonmentJob {
  private readonly logger = new Logger(ExamAbandonmentJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const cutoff = new Date(
      Date.now() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    const candidates = await this.prisma.examBaseAttempt.findMany({
      where: {
        finishedAt: null,
        abandonedAt: null,
        startedAt: { lt: cutoff },
      },
      select: {
        id: true,
        userId: true,
        examBaseId: true,
        startedAt: true,
        trainingSession: { select: { id: true } },
        answers: {
          select: {
            selectedAlternativeId: true,
            examBaseQuestion: { select: { position: true } },
          },
        },
      },
    });

    if (candidates.length === 0) return;

    this.logger.log(
      `Marking ${candidates.length} exam attempt(s) as abandoned.`,
    );

    const now = new Date();
    for (const attempt of candidates) {
      const answeredPositions = attempt.answers
        .filter((a) => a.selectedAlternativeId != null)
        .map((a) => a.examBaseQuestion.position);
      const lastQuestionPosition =
        answeredPositions.length > 0 ? Math.max(...answeredPositions) : null;
      const hoursSinceStart =
        (now.getTime() - attempt.startedAt.getTime()) / (60 * 60 * 1000);

      this.analytics.capture({
        userId: attempt.userId,
        event: 'exam_abandoned',
        properties: {
          attemptId: attempt.id,
          examBaseId: attempt.examBaseId,
          source: attempt.trainingSession ? 'treino' : 'exams_direct',
          answeredCount: answeredPositions.length,
          lastQuestionPosition,
          hoursSinceStart: Math.round(hoursSinceStart * 10) / 10,
        },
      });

      await this.prisma.examBaseAttempt.update({
        where: { id: attempt.id },
        data: { abandonedAt: now },
      });
    }
  }
}
