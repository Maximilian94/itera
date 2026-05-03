import { Injectable, NotFoundException } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import type {
  AttributionData,
  QualificacaoPayload,
} from '@domain/diagnostico/diagnostico.interface';
import { PrismaService } from '../prisma/prisma.service';
import { LeadEventService } from './lead-event.service';
import { TagService } from './tag.service';
import { computeTagsFromQualificacao } from './qualificacao-tag.helper';

export interface UpsertLeadInput {
  name?: string;
  phone?: string;
  fonteLp?: string;
  attribution?: AttributionData;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagService: TagService,
    private readonly leadEventService: LeadEventService,
  ) {}

  /**
   * First-touch upsert: ao criar lead novo, persiste attribution + ip + ua.
   * Em lead existente, **não sobrescreve** attribution (preserva fonte original)
   * e só preenche `name`/`phone`/`fonteLp` se ainda vazios.
   */
  async upsertByEmail(email: string, input: UpsertLeadInput): Promise<Lead> {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.lead.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      const updateData: Prisma.LeadUpdateInput = {};
      if (!existing.name && input.name) updateData.name = input.name;
      if (!existing.phone && input.phone) updateData.phone = input.phone;
      if (!existing.fonteLp && input.fonteLp) updateData.fonteLp = input.fonteLp;

      if (Object.keys(updateData).length === 0) return existing;

      return this.prisma.lead.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    const attr = input.attribution ?? {};
    return this.prisma.lead.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        phone: input.phone,
        fonteLp: input.fonteLp,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        utmSource: attr.utmSource,
        utmMedium: attr.utmMedium,
        utmCampaign: attr.utmCampaign,
        utmContent: attr.utmContent,
        utmTerm: attr.utmTerm,
        fbclid: attr.fbclid,
        gclid: attr.gclid,
        landingPage: attr.landingPage,
        referrer: attr.referrer,
        fbp: attr.fbp,
        fbc: attr.fbc,
      },
    });
  }

  /**
   * Persiste a qualificação, aplica tags derivadas + 'qualificacao_concluida'
   * e registra o evento. Lança NotFoundException se o lead não existir.
   */
  async updateQualificacao(
    leadId: string,
    qualificacao: QualificacaoPayload,
  ): Promise<Lead> {
    const existing = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!existing) {
      throw new NotFoundException(`Lead não encontrado: ${leadId}`);
    }

    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { qualificacao: qualificacao as unknown as Prisma.InputJsonValue },
    });

    const tags = [
      ...computeTagsFromQualificacao(qualificacao),
      'qualificacao_concluida',
    ];
    await this.tagService.applyTags(leadId, tags);

    await this.leadEventService.record(leadId, 'qualificacao_concluida', {
      qualificacao: qualificacao as unknown as Prisma.InputJsonValue,
    });

    return lead;
  }

  async findById(leadId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }
}
