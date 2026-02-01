import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamBoardService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.examBoard.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  async getOne(examBoardId: string) {
    const examBoard = await this.prisma.examBoard.findUnique({
      where: { id: examBoardId },
      select: { id: true, name: true, logoUrl: true },
    });
    if (!examBoard) throw new NotFoundException('exam board not found');
    return examBoard;
  }

  create(input: { name: string; logoUrl: string }) {
    return this.prisma.examBoard.create({
      data: { name: input.name, logoUrl: input.logoUrl },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  async update(
    examBoardId: string,
    input: { name?: string; logoUrl?: string },
  ) {
    const exists = await this.prisma.examBoard.findUnique({
      where: { id: examBoardId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('exam board not found');

    return this.prisma.examBoard.update({
      where: { id: examBoardId },
      data: { name: input.name, logoUrl: input.logoUrl },
      select: { id: true, name: true, logoUrl: true },
    });
  }

  async remove(examBoardId: string) {
    const exists = await this.prisma.examBoard.findUnique({
      where: { id: examBoardId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('exam board not found');

    await this.prisma.examBoard.delete({ where: { id: examBoardId } });
    return { ok: true };
  }
}
