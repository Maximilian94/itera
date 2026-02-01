import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamBaseService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.examBase.findMany({
      orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        institution: true,
        role: true,
        examDate: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
  }

  async getOne(examBaseId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: {
        id: true,
        name: true,
        institution: true,
        role: true,
        examDate: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');
    return examBase;
  }

  create(input: {
    name: string;
    examBoardId?: string;
    institution?: string;
    role: string;
    examDate: string;
  }) {
    return this.prisma.examBase.create({
      data: {
        name: input.name,
        examBoardId: input.examBoardId,
        institution: input.institution,
        role: input.role,
        examDate: new Date(input.examDate),
      },
      select: {
        id: true,
        name: true,
        institution: true,
        role: true,
        examDate: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
  }

  async update(
    examBaseId: string,
    input: {
      name?: string;
      examBoardId?: string | null;
      institution?: string | null;
      role?: string;
      examDate?: string;
    },
  ) {
    const exists = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('exam base not found');

    return this.prisma.examBase.update({
      where: { id: examBaseId },
      data: {
        name: input.name,
        examBoardId: input.examBoardId,
        institution: input.institution,
        role: input.role,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
      select: {
        id: true,
        name: true,
        institution: true,
        role: true,
        examDate: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
  }
}

