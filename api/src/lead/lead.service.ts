import { Injectable } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import type {
  AttributionData,
  QualificacaoPayload,
} from '@domain/diagnostico/diagnostico.interface';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  async updateQualificacao(
    leadId: string,
    qualificacao: QualificacaoPayload,
  ): Promise<Lead> {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { qualificacao: qualificacao as unknown as Prisma.InputJsonValue },
    });
  }

  async findById(leadId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({ where: { id: leadId } });
  }
}
