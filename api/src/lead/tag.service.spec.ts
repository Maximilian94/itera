import { Test } from '@nestjs/testing';
import { TagService } from './tag.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TagService', () => {
  let service: TagService;
  let prisma: {
    tag: { findMany: jest.Mock };
    leadTag: { createMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tag: { findMany: jest.fn() },
      leadTag: { createMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [TagService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(TagService);
  });

  it('aplica múltiplas tags com skipDuplicates', async () => {
    prisma.tag.findMany.mockResolvedValue([
      { id: 'tag-1', name: 'lp_edital' },
      { id: 'tag-2', name: 'diagnostico_concluido' },
    ]);

    await service.applyTags('lead-1', ['lp_edital', 'diagnostico_concluido']);

    expect(prisma.leadTag.createMany).toHaveBeenCalledWith({
      data: [
        { leadId: 'lead-1', tagId: 'tag-1' },
        { leadId: 'lead-1', tagId: 'tag-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('deduplica tags repetidas no input', async () => {
    prisma.tag.findMany.mockResolvedValue([{ id: 'tag-1', name: 'direct' }]);

    await service.applyTags('lead-1', ['direct', 'direct', 'direct']);

    expect(prisma.tag.findMany).toHaveBeenCalledWith({
      where: { name: { in: ['direct'] } },
      select: { id: true, name: true },
    });
    expect(prisma.leadTag.createMany).toHaveBeenCalledWith({
      data: [{ leadId: 'lead-1', tagId: 'tag-1' }],
      skipDuplicates: true,
    });
  });

  it('é no-op quando lista vazia', async () => {
    await service.applyTags('lead-1', []);
    expect(prisma.tag.findMany).not.toHaveBeenCalled();
    expect(prisma.leadTag.createMany).not.toHaveBeenCalled();
  });

  it('ignora tags inexistentes (loga warning, aplica as encontradas)', async () => {
    prisma.tag.findMany.mockResolvedValue([{ id: 'tag-1', name: 'lp_edital' }]);

    await service.applyTags('lead-1', ['lp_edital', 'tag_inexistente']);

    expect(prisma.leadTag.createMany).toHaveBeenCalledWith({
      data: [{ leadId: 'lead-1', tagId: 'tag-1' }],
      skipDuplicates: true,
    });
  });
});
