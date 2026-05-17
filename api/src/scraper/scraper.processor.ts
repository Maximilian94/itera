import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PciParserService } from './pci-parser.service';
import { NormalizerService } from './normalizer.service';
import { ScoringService } from './scoring.service';
import { SCRAPER_QUEUE_NAME } from './scraper.constants';

export interface ScraperJobPayload {
  runId: string;
  cargoSlugs: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

@Processor(SCRAPER_QUEUE_NAME)
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: PciParserService,
    private readonly normalizer: NormalizerService,
    private readonly scoring: ScoringService,
  ) {
    super();
  }

  async process(job: Job<ScraperJobPayload>): Promise<void> {
    const { runId, cargoSlugs } = job.data;

    this.logger.log(
      `Starting scraper run ${runId} with ${cargoSlugs.length} cargo slugs`,
    );

    let totalPages = 0;
    let totalEntries = 0;
    let newEntries = 0;

    try {
      for (const cargoSlug of cargoSlugs) {
        const result = await this.processCargoSlug(runId, cargoSlug);
        totalPages += result.pages;
        totalEntries += result.total;
        newEntries += result.newCount;

        await this.prisma.scraperRun.update({
          where: { id: runId },
          data: {
            lastCargoSlug: cargoSlug,
            totalPages,
            totalEntries,
            newEntries,
          },
        });
      }

      await this.prisma.scraperRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          totalPages,
          totalEntries,
          newEntries,
        },
      });

      this.logger.log(
        `Scraper run ${runId} completed: ${newEntries} new / ${totalEntries} total entries across ${totalPages} pages`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      await this.prisma.scraperRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorLog: errorMessage,
          totalPages,
          totalEntries,
          newEntries,
        },
      });

      throw err;
    }
  }

  private async processCargoSlug(
    runId: string,
    cargoSlug: string,
  ): Promise<{ pages: number; total: number; newCount: number }> {
    this.logger.log(`Processing cargo slug: ${cargoSlug}`);

    const firstPage = await this.parser.fetchAndParsePage(cargoSlug, 1);
    const maxPage = firstPage.totalPages;
    let total = 0;
    let newCount = 0;

    const pageResult = await this.processEntries(
      runId,
      cargoSlug,
      firstPage.entries,
    );
    total += pageResult.total;
    newCount += pageResult.newCount;

    await this.updateRunProgress(runId, cargoSlug, 1);

    for (let page = 2; page <= maxPage; page++) {
      await sleep(2000 + Math.random() * 1000);

      try {
        const pageData = await this.parser.fetchAndParsePage(
          cargoSlug,
          page,
        );
        const result = await this.processEntries(
          runId,
          cargoSlug,
          pageData.entries,
        );
        total += result.total;
        newCount += result.newCount;
      } catch (err) {
        this.logger.warn(
          `Failed to process page ${page} of ${cargoSlug}: ${err instanceof Error ? err.message : err}`,
        );
      }

      await this.updateRunProgress(runId, cargoSlug, page);
    }

    this.logger.log(
      `Finished ${cargoSlug}: ${maxPage} pages, ${newCount} new / ${total} total`,
    );

    return { pages: maxPage, total, newCount };
  }

  private async processEntries(
    runId: string,
    cargoSlug: string,
    entries: { examName: string; downloadUrl: string; year: number; institution: string; examBoardRaw: string; pageUrl: string }[],
  ): Promise<{ total: number; newCount: number }> {
    let newCount = 0;

    for (const entry of entries) {
      const existing = await this.prisma.pciExamEntry.findUnique({
        where: { downloadUrl: entry.downloadUrl },
        select: { id: true },
      });

      if (existing) continue;

      const scope = this.normalizer.inferGovernmentScope(entry.institution);
      const state = this.normalizer.inferState(entry.institution);
      const city = this.normalizer.inferCity(entry.institution);
      const priorityScore = this.scoring.calculate({
        year: entry.year,
        examBoardRaw: entry.examBoardRaw,
        institution: entry.institution,
        governmentScope: scope,
      });

      await this.prisma.pciExamEntry.create({
        data: {
          downloadUrl: entry.downloadUrl,
          examName: entry.examName,
          year: entry.year,
          institution: entry.institution,
          examBoardRaw: entry.examBoardRaw,
          cargoSlug,
          governmentScope: scope,
          state,
          city,
          priorityScore,
          pageUrl: entry.pageUrl,
          scraperRunId: runId,
        },
      });

      newCount++;
    }

    return { total: entries.length, newCount };
  }

  private async updateRunProgress(
    runId: string,
    cargoSlug: string,
    page: number,
  ): Promise<void> {
    await this.prisma.scraperRun.update({
      where: { id: runId },
      data: { lastCargoSlug: cargoSlug, lastPage: page },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<ScraperJobPayload> | undefined,
    err: Error,
  ): void {
    if (!job) return;
    this.logger.error(
      `Scraper job failed: runId=${job.data.runId}, error=${err.message}`,
    );
  }
}
