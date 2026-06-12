import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GROUP_SELECT = {
  id: true,
  order: true,
  name: true,
  topics: true,
} as const;

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new BadRequestException(`${field} must not be empty.`);
  return trimmed;
}

/**
 * Conteúdo programático do edital por cargo (MAX-14): grupos colapsáveis
 * com tópicos em texto corrido, mantidos manualmente pelo admin na fase EDITAL.
 */
@Injectable()
export class ExamSyllabusGroupService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertExamBaseExists(examBaseId: string): Promise<void> {
    const exists = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('exam base not found');
  }

  list(examBaseId: string) {
    return this.prisma.examSyllabusGroup.findMany({
      where: { examBaseId },
      orderBy: { order: 'asc' },
      select: GROUP_SELECT,
    });
  }

  async create(
    examBaseId: string,
    input: { name: string; topics: string; order?: number },
  ) {
    await this.assertExamBaseExists(examBaseId);

    let order = input.order;
    if (order === undefined) {
      const last = await this.prisma.examSyllabusGroup.findFirst({
        where: { examBaseId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = last ? last.order + 1 : 0;
    }

    return this.prisma.examSyllabusGroup.create({
      data: {
        examBaseId,
        order,
        name: normalizeRequiredText(input.name, 'name'),
        topics: normalizeRequiredText(input.topics, 'topics'),
      },
      select: GROUP_SELECT,
    });
  }

  async update(
    examBaseId: string,
    groupId: string,
    input: { name?: string; topics?: string; order?: number },
  ) {
    const group = await this.prisma.examSyllabusGroup.findFirst({
      where: { id: groupId, examBaseId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('syllabus group not found');

    return this.prisma.examSyllabusGroup.update({
      where: { id: groupId },
      data: {
        name:
          input.name === undefined
            ? undefined
            : normalizeRequiredText(input.name, 'name'),
        topics:
          input.topics === undefined
            ? undefined
            : normalizeRequiredText(input.topics, 'topics'),
        order: input.order,
      },
      select: GROUP_SELECT,
    });
  }

  /** Reordena todos os grupos da prova. `ids` deve conter exatamente os grupos existentes, na nova ordem. */
  async reorder(examBaseId: string, ids: string[]) {
    await this.assertExamBaseExists(examBaseId);

    const existing = await this.prisma.examSyllabusGroup.findMany({
      where: { examBaseId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((g) => g.id));
    const incomingIds = new Set(ids);
    if (
      existingIds.size !== incomingIds.size ||
      ids.length !== incomingIds.size ||
      [...existingIds].some((id) => !incomingIds.has(id))
    ) {
      throw new BadRequestException(
        'ids must contain exactly the syllabus groups of this exam base, each once.',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.examSyllabusGroup.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
    return this.list(examBaseId);
  }

  async remove(examBaseId: string, groupId: string) {
    const group = await this.prisma.examSyllabusGroup.findFirst({
      where: { id: groupId, examBaseId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('syllabus group not found');

    await this.prisma.examSyllabusGroup.delete({ where: { id: groupId } });
    return { ok: true };
  }
}
