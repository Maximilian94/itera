import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkill, SkillNode } from '@domain/skill/skill.interface';
import { Skill } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSkillsHierarchy(): Promise<SkillNode[]> {
    const allSkills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });

    const skillMap: Record<string, SkillNode> = {};
    allSkills.forEach((skill) => {
      skillMap[skill.id] = { ...skill, children: [] };
    });

    const rootSkills: SkillNode[] = [];

    allSkills.forEach((skill) => {
      const node = skillMap[skill.id];
      if (skill.parentId && skillMap[skill.parentId]) {
        skillMap[skill.parentId].children.push(node);
      } else {
        rootSkills.push(node);
      }
    });

    return rootSkills;
  }

  async createSkill(createSkill: CreateSkill): Promise<SkillNode[]> {
    let parentSkill: Skill | null = null;

    if (createSkill.parentId) {
      parentSkill = await this.prisma.skill.findUnique({
        where: { id: createSkill.parentId },
      });
    }

    const newId = randomUUID();

    await this.prisma.skill.create({
      data: {
        id: newId,
        name: createSkill.name,
        path: parentSkill ? `${parentSkill.path}/${newId}` : '',
        parentId: parentSkill?.id ?? null,
      },
    });

    return await this.listSkillsHierarchy();
  }
}
