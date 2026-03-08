import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailDispatchLogService } from './email-dispatch-log.service';
import { EMAIL_QUEUE_NAME } from './email.producer';
import type { EmailJobPayload } from './email-job.types';

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly dispatchLog: EmailDispatchLogService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJobPayload, void, string>): Promise<void> {
    const payload = job.data;
    const jobId = job.id ?? job.name;

    this.logger.log(`Processando job de email: type=${payload.type}, jobId=${jobId}`);

    switch (payload.type) {
      case 'welcome':
        await this.emailService.sendWelcomeEmail(payload.to, payload.params);
        break;
      case 'subscription_activated':
        await this.emailService.sendSubscriptionActivatedEmail(
          payload.to,
          payload.params,
        );
        break;
      case 'payment_failed':
        await this.emailService.sendPaymentFailedEmail(
          payload.to,
          payload.params,
        );
        break;
      case 'subscription_canceled':
        await this.emailService.sendSubscriptionCanceledEmail(
          payload.to,
          payload.params,
        );
        break;
      case 'first_training_completed':
        await this.emailService.sendFirstTrainingCompletedEmail(
          payload.to,
          payload.params,
        );
        break;
      case 'inactivity_reminder':
        await this.emailService.sendInactivityReminderEmail(
          payload.to,
          payload.params,
        );
        break;
      case 'email_verified':
        await this.emailService.sendEmailVerifiedEmail(
          payload.to,
          payload.params,
        );
        try {
          await this.prisma.userEmailEvent.create({
            data: {
              userId: payload.clerkUserId,
              type: 'email_verified',
            },
          });
        } catch (e) {
          // Idempotência: ignora se já existir (race ou retry)
          if ((e as { code?: string })?.code !== 'P2002') throw e;
        }
        break;
      default:
        this.logger.warn(`Tipo de email desconhecido: ${(payload as EmailJobPayload).type}`);
        return;
    }

    await this.dispatchLog.logSent(jobId as string);
    this.logger.log(`Email enviado com sucesso: type=${payload.type}, jobId=${jobId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobPayload, void, string> | undefined, err: Error): void {
    if (!job) return;
    const jobId = job.id ?? job.name;
    const errorMessage = err?.message ?? String(err);
    this.logger.error(
      `Job de email falhou: type=${job.data?.type}, jobId=${jobId}, error=${errorMessage}`,
    );
    this.dispatchLog.logFailed(jobId as string, errorMessage).catch((e) => {
      this.logger.error(`Falha ao registrar log de dispatch: ${e instanceof Error ? e.message : String(e)}`);
    });
  }
}
