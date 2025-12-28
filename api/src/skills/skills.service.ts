import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSkills() {
    const skills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return { skills };
  }
}
