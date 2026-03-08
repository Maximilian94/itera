import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EmailSource } from './email-job.types';

export type EmailDispatchStatus = 'queued' | 'sent' | 'failed' | 'skipped';

@Injectable()
export class EmailDispatchLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logQueued(params: {
    type: string;
    recipient: string;
    source: EmailSource;
    externalEventId?: string;
    jobId?: string;
  }): Promise<void> {
    await this.prisma.emailDispatchLog.create({
      data: {
        type: params.type,
        recipient: params.recipient,
        source: params.source,
        externalEventId: params.externalEventId,
        jobId: params.jobId,
        status: 'queued',
      },
    });
  }

  async logSent(jobId: string): Promise<void> {
    await this.prisma.emailDispatchLog.updateMany({
      where: { jobId, status: 'queued' },
      data: { status: 'sent', sentAt: new Date() },
    });
  }

  async logFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.prisma.emailDispatchLog.updateMany({
      where: { jobId, status: 'queued' },
      data: { status: 'failed', errorMessage },
    });
  }

  async logSkipped(params: {
    type: string;
    recipient: string;
    source: EmailSource;
    externalEventId?: string;
    jobId?: string;
  }): Promise<void> {
    await this.prisma.emailDispatchLog.create({
      data: {
        type: params.type,
        recipient: params.recipient,
        source: params.source,
        externalEventId: params.externalEventId,
        jobId: params.jobId,
        status: 'skipped',
      },
    });
  }
}
