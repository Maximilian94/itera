import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GovernmentScope, PciEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_CARGO_SLUGS, SCRAPER_QUEUE_NAME } from './scraper.constants';
import type { ScraperJobPayload } from './scraper.processor';

@Injectable()
export class ScraperService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SCRAPER_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async triggerRun(cargoSlugs?: string[]) {
    const slugs = cargoSlugs?.length ? cargoSlugs : DEFAULT_CARGO_SLUGS;

    const activeRun = await this.prisma.scraperRun.findFirst({
      where: { status: 'running' },
      select: { id: true },
    });

    if (activeRun) {
      throw new BadRequestException(
        'A scraper run is already in progress. Wait for it to finish or cancel it.',
      );
    }

    const run = await this.prisma.scraperRun.create({
      data: { cargoSlugs: slugs, status: 'running' },
    });

    const payload: ScraperJobPayload = {
      runId: run.id,
      cargoSlugs: slugs,
    };

    await this.queue.add('scrape', payload, {
      attempts: 1,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    });

    return run;
  }

  async getRunStatus(runId: string) {
    const run = await this.prisma.scraperRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('Scraper run not found');
    return run;
  }

  listRuns() {
    return this.prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }

  listEntries() {
    return this.prisma.pciExamEntry.findMany({
      orderBy: { priorityScore: 'desc' },
    });
  }

  getRunDiff(runId: string) {
    return this.prisma.pciExamEntry.findMany({
      where: { scraperRunId: runId },
      orderBy: { priorityScore: 'desc' },
    });
  }

  async updateEntryStatus(id: string, status: PciEntryStatus) {
    const entry = await this.prisma.pciExamEntry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException('PCI entry not found');

    return this.prisma.pciExamEntry.update({
      where: { id },
      data: { status },
    });
  }

  async promoteEntry(id: string) {
    const entry = await this.prisma.pciExamEntry.findUnique({
      where: { id },
    });
    if (!entry) throw new NotFoundException('PCI entry not found');

    if (entry.status === PciEntryStatus.PROMOTED) {
      throw new BadRequestException('Entry already promoted');
    }

    const examBase = await this.prisma.examBase.create({
      data: {
        name: entry.examName,
        role: entry.cargoRaw ?? entry.cargoSlug,
        institution: entry.institution,
        governmentScope:
          entry.governmentScope ?? GovernmentScope.MUNICIPAL,
        state: entry.state,
        city: entry.city,
        examDate: new Date(entry.year, 0, 1),
      },
    });

    await this.prisma.pciExamEntry.update({
      where: { id },
      data: {
        status: PciEntryStatus.PROMOTED,
        promotedToId: examBase.id,
      },
    });

    return { examBase, pciEntry: { id: entry.id, status: 'PROMOTED' } };
  }
}
