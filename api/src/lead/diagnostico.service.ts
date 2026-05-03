import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DiagnosticoSubmissionPayload } from '@domain/diagnostico/diagnostico.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { EmailProducerService } from '../email/email.producer';
import { LeadService } from './lead.service';
import { TagService } from './tag.service';
import { LeadEventService } from './lead-event.service';
import { computeTagsFromAttribution } from './attribution-tag.helper';

export interface SubmitDiagnosticoResult {
  leadId: string;
  diagnosticoRespostaId: string;
}

/**
 * Orquestra o submit principal do wizard. Sequência (§8.3 do doc):
 *  1. upsert lead (first-touch attribution)
 *  2. cria DiagnosticoResposta
 *  3. aplica tags: lp_*, diagnostico_concluido, perfil_*, attribution
 *  4. enfileira email transacional
 *  5. registra evento diagnostico_concluido em lead_events
 *  6. captura evento autoritativo no PostHog
 *
 * Meta CAPI fica para a fase 8 — não é chamada aqui.
 *
 * Falhas em qualquer passo viram 500 (a request inteira falha) — exceto
 * analytics, que não pode bloquear o submit.
 */
@Injectable()
export class DiagnosticoService {
  private readonly logger = new Logger(DiagnosticoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadService: LeadService,
    private readonly tagService: TagService,
    private readonly leadEventService: LeadEventService,
    private readonly emailProducer: EmailProducerService,
    private readonly analytics: AnalyticsService,
  ) {}

  async submit(
    payload: DiagnosticoSubmissionPayload,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<SubmitDiagnosticoResult> {
    const lead = await this.leadService.upsertByEmail(payload.email, {
      name: payload.name,
      phone: payload.phone,
      fonteLp: payload.fonteLp,
      attribution: payload.attribution,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const resposta = await this.prisma.diagnosticoResposta.create({
      data: {
        leadId: lead.id,
        respostas: payload.respostas as unknown as Prisma.InputJsonValue,
        resultado: payload.resultado as unknown as Prisma.InputJsonValue,
      },
    });

    const attributionTags = computeTagsFromAttribution(payload.attribution);
    const tags = [
      `lp_${payload.fonteLp}`,
      'diagnostico_concluido',
      `perfil_${payload.resultado.perfil.slug}`,
      ...attributionTags,
    ];
    await this.tagService.applyTags(lead.id, tags);

    await this.emailProducer.enqueueDiagnosticoResultadoEmail(
      payload.email,
      {
        firstName: payload.name,
        resultado: payload.resultado,
      },
      {
        leadId: lead.id,
        diagnosticoRespostaId: resposta.id,
      },
    );

    await this.leadEventService.record(lead.id, 'diagnostico_concluido', {
      totalScore: payload.resultado.totalScore,
      perfil: payload.resultado.perfil.slug,
      resultado: payload.resultado as unknown as Prisma.InputJsonValue,
    });

    try {
      this.analytics.capture({
        userId: lead.email,
        event: 'diagnostico_concluido',
        properties: {
          email: lead.email,
          leadId: lead.id,
          fonteLp: payload.fonteLp,
          paidSource: attributionTags[0],
          perfil: payload.resultado.perfil.slug,
        },
      });
    } catch (e) {
      this.logger.warn(
        `PostHog capture falhou (ignorando): ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return { leadId: lead.id, diagnosticoRespostaId: resposta.id };
  }
}
