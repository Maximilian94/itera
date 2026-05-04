import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadEventService } from '../lead-event.service';
import { TagService } from '../tag.service';

/**
 * Mapeia eventos do Resend para eventos/tags do lead.
 *
 * Eventos Resend cobertos (§8.6):
 *  - email.opened     → event email_aberto      + tag email_aberto
 *  - email.clicked    → event email_clicado     + tag email_clicado
 *  - email.bounced    → event email_bounced     (sem tag)
 *  - email.complained → event email_complained  + tag unsubscribed
 *                       + lead.unsubscribedAt = now
 *
 * Idempotência via tabela WebhookEvent: cada svix-id é processado só uma vez.
 * Eventos sem `email` ou para emails não-rastreados (não há lead com aquele
 * email) são logados e descartados — não falha o webhook.
 */

interface ResendDataLike {
  email_id?: string;
  to?: string | string[];
  from?: string;
  subject?: string;
  click?: { link?: string };
  bounce?: { type?: string; message?: string };
}

interface Mapping {
  eventType: string;
  tagName?: string;
  unsubscribe?: boolean;
}

const TYPE_MAP: Record<string, Mapping> = {
  'email.opened': { eventType: 'email_aberto', tagName: 'email_aberto' },
  'email.clicked': { eventType: 'email_clicado', tagName: 'email_clicado' },
  'email.bounced': { eventType: 'email_bounced' },
  'email.complained': {
    eventType: 'email_complained',
    tagName: 'unsubscribed',
    unsubscribe: true,
  },
};

@Injectable()
export class ResendWebhookService {
  private readonly logger = new Logger(ResendWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadEventService: LeadEventService,
    private readonly tagService: TagService,
  ) {}

  async process(input: {
    eventId: string;
    type: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const mapping = TYPE_MAP[input.type];
    if (!mapping) {
      this.logger.log(`Resend webhook ignorado (tipo não mapeado): ${input.type}`);
      return;
    }

    // Idempotência via WebhookEvent. Reusa o mesmo modelo do Clerk (source='resend').
    try {
      await this.prisma.webhookEvent.create({
        data: {
          source: 'resend',
          eventId: input.eventId,
          eventType: input.type,
          status: 'processed',
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        this.logger.log(
          `Resend webhook já processado (dedup): eventId=${input.eventId}`,
        );
        return;
      }
      throw e;
    }

    const data = (input.data ?? {}) as ResendDataLike;
    const email = extractFirstEmail(data.to);
    if (!email) {
      this.logger.warn(
        `Resend webhook sem campo 'to' válido: type=${input.type}, eventId=${input.eventId}`,
      );
      return;
    }

    const lead = await this.prisma.lead.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (!lead) {
      this.logger.log(
        `Resend webhook ignorado: lead não encontrado para ${email}`,
      );
      return;
    }

    const eventPayload: Prisma.InputJsonValue = {
      resendMessageId: data.email_id ?? null,
      ...(input.type === 'email.clicked' && data.click?.link
        ? { link: data.click.link }
        : {}),
      ...(input.type === 'email.bounced' && data.bounce
        ? { reason: data.bounce.message ?? data.bounce.type ?? 'unknown' }
        : {}),
    };

    await this.leadEventService.record(lead.id, mapping.eventType, eventPayload);

    if (mapping.tagName) {
      await this.tagService.applyTag(lead.id, mapping.tagName);
    }

    if (mapping.unsubscribe) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { unsubscribedAt: new Date() },
      });
    }
  }
}

function extractFirstEmail(to: string | string[] | undefined): string | null {
  if (!to) return null;
  if (Array.isArray(to)) return to[0]?.trim() || null;
  return to.trim() || null;
}
