import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Aplica tags (estado) a leads. As tags base são seedadas via migration;
 * este service só consulta por nome e cria a junção `lead_tags`.
 *
 * `applyTags` é idempotente: tag duplicada em um lead vira no-op (skipDuplicates).
 * Tag inexistente é registrada como warning e ignorada.
 */
@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyTag(leadId: string, tagName: string): Promise<void> {
    await this.applyTags(leadId, [tagName]);
  }

  async applyTags(leadId: string, tagNames: string[]): Promise<void> {
    const uniqueNames = Array.from(new Set(tagNames.filter(Boolean)));
    if (uniqueNames.length === 0) return;

    const tags = await this.prisma.tag.findMany({
      where: { name: { in: uniqueNames } },
      select: { id: true, name: true },
    });

    const foundNames = new Set(tags.map((t) => t.name));
    const missing = uniqueNames.filter((n) => !foundNames.has(n));
    if (missing.length > 0) {
      this.logger.warn(
        `Tags não encontradas (faltam no seed?): ${missing.join(', ')}`,
      );
    }

    if (tags.length === 0) return;

    await this.prisma.leadTag.createMany({
      data: tags.map((t) => ({ leadId, tagId: t.id })),
      skipDuplicates: true,
    });
  }
}
