import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EmailJobPayload,
  EmailSource,
  getEmailJobId,
} from './email-job.types';
import { EmailDispatchLogService } from './email-dispatch-log.service';

export const EMAIL_QUEUE_NAME = 'email';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/**
 * Producer responsável por enfileirar jobs de email.
 * Implementa deduplicação via jobId determinístico e registra logs de dispatch.
 */
@Injectable()
export class EmailProducerService {
  private readonly logger = new Logger(EmailProducerService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly queue: Queue,
    private readonly dispatchLog: EmailDispatchLogService,
  ) {}

  /**
   * Enfileira um job de email. Retorna true se enfileirado, false se ignorado por duplicação.
   */
  async enqueue(payload: EmailJobPayload): Promise<boolean> {
    const jobId = getEmailJobId(payload);

    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'waiting' || state === 'active' || state === 'delayed') {
        this.logger.log(
          `Job duplicado ignorado: jobId=${jobId}, state=${state}`,
        );
        await this.dispatchLog.logSkipped({
          type: payload.type,
          recipient: payload.to,
          source: payload.source,
          externalEventId: payload.externalEventId,
          jobId,
        });
        return false;
      }
      if (state === 'completed') {
        const completedAt = existing.finishedOn;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (completedAt && completedAt > oneHourAgo) {
          this.logger.log(
            `Job já concluído recentemente ignorado: jobId=${jobId}`,
          );
          await this.dispatchLog.logSkipped({
            type: payload.type,
            recipient: payload.to,
            source: payload.source,
            externalEventId: payload.externalEventId,
            jobId,
          });
          return false;
        }
      }
    }

    try {
      const job = await this.queue.add(
        payload.type,
        payload,
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId,
        },
      );

      await this.dispatchLog.logQueued({
        type: payload.type,
        recipient: payload.to,
        source: payload.source,
        externalEventId: payload.externalEventId,
        jobId: job.id ?? jobId,
      });

      this.logger.log(`Email enfileirado: type=${payload.type}, jobId=${jobId}`);
      return true;
    } catch (err) {
      this.logger.error(
        `Falha ao enfileirar email: type=${payload.type}, error=${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async enqueueWelcomeEmail(
    to: string,
    params: { firstName?: string },
    options: { clerkUserId: string; source?: EmailSource; externalEventId?: string },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'welcome',
      to,
      clerkUserId: options.clerkUserId,
      source: options.source ?? 'clerk',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueueSubscriptionActivatedEmail(
    to: string,
    params: { planName: string },
    options: {
      subscriptionId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'subscription_activated',
      to,
      subscriptionId: options.subscriptionId,
      source: options.source ?? 'stripe',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueuePaymentFailedEmail(
    to: string,
    params: { updateBillingUrl: string },
    options: {
      invoiceId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'payment_failed',
      to,
      invoiceId: options.invoiceId,
      source: options.source ?? 'stripe',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueueSubscriptionCanceledEmail(
    to: string,
    params: { planName?: string },
    options: {
      subscriptionId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'subscription_canceled',
      to,
      subscriptionId: options.subscriptionId,
      source: options.source ?? 'stripe',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueueFirstTrainingCompletedEmail(
    to: string,
    params: { scorePercent: number; totalQuestions: number },
    options: {
      trainingSessionId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'first_training_completed',
      to,
      trainingSessionId: options.trainingSessionId,
      source: options.source ?? 'system',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueueInactivityReminderEmail(
    to: string,
    params: { daysInactive: 3 | 7; resumeUrl: string },
    options: {
      userId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'inactivity_reminder',
      to,
      userId: options.userId,
      source: options.source ?? 'system',
      externalEventId: options.externalEventId,
      params,
    });
  }

  async enqueueEmailVerifiedEmail(
    to: string,
    params: { firstName?: string; dashboardUrl: string },
    options: {
      clerkUserId: string;
      source?: EmailSource;
      externalEventId?: string;
    },
  ): Promise<boolean> {
    return this.enqueue({
      type: 'email_verified',
      to,
      clerkUserId: options.clerkUserId,
      source: options.source ?? 'clerk',
      externalEventId: options.externalEventId,
      params,
    });
  }
}
