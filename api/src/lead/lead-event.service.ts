import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Registra eventos append-only no histórico do lead. Event = "história"
 * (quando o lead fez X), em contraste com Tag = "estado" (esse lead é X?).
 *
 * `type` segue a taxonomia em §7 do doc (diagnostico_concluido,
 * qualificacao_concluida, email_enviado, email_aberto, etc.).
 */
@Injectable()
export class LeadEventService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    leadId: string,
    type: string,
    payload?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.leadEvent.create({
      data: { leadId, type, payload: payload ?? Prisma.JsonNull },
    });
  }
}
