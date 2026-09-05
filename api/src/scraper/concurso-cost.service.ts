import { Injectable, Logger } from '@nestjs/common';
import { ConcursoAiPhase, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CostEntry, CostReport } from '../common/ai-cost';

/** Uma fase, com tudo que já se gastou nela neste concurso. */
export interface PhaseCost {
  phase: ConcursoAiPhase;
  usd: number;
  /** Quantas vezes a fase rodou — inclui as tentativas que não acharam nada. */
  runs: number;
  lastAt: string | null;
  entries: CostEntry[];
}

export interface ConcursoCostReport {
  total: number;
  byPhase: PhaseCost[];
}

/** Ordem do fluxo admin, não alfabética — a aba lê como uma linha do tempo. */
const PHASE_ORDER: ConcursoAiPhase[] = [
  ConcursoAiPhase.NEWS_EXTRACT,
  ConcursoAiPhase.LINK_SEARCH,
  ConcursoAiPhase.DOCUMENTS_CHECK,
  ConcursoAiPhase.DOCUMENT_ANALYSIS,
];

/**
 * Registro do que cada fase custou de IA, por concurso.
 *
 * O `AiUsageMeter` já media o gasto de uma operação, mas o número morria na
 * resposta do request: o admin via o preço do clique e nunca mais. Aqui ele
 * vira histórico, para responder "quanto este concurso já custou" — somando as
 * repetições e as tentativas frustradas, que são exatamente as que doem.
 */
@Injectable()
export class ConcursoCostService {
  private readonly logger = new Logger(ConcursoCostService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grava o custo de UMA execução. Relatório sem chamada nenhuma não vira
   * linha: fase que não gastou não deve poluir o histórico (e é assim que a
   * fase 1, que não usa IA, fica registrada como zero — pela ausência).
   *
   * Nunca lança: contabilidade não pode derrubar a operação que ela mede.
   */
  async record(
    concursoId: string,
    phase: ConcursoAiPhase,
    report: CostReport,
    documentId?: string | null,
  ): Promise<void> {
    if (!report || report.entries.length === 0) return;
    try {
      await this.prisma.concursoAiCost.create({
        data: {
          concursoId,
          phase,
          usd: new Prisma.Decimal(report.usd.toFixed(6)),
          entries: report.entries as unknown as Prisma.InputJsonValue,
          documentId: documentId ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `falha ao gravar custo (${phase}, concurso ${concursoId}): ${(err as Error).message?.slice(0, 160)}`,
      );
    }
  }

  /** Histórico agregado por fase, na ordem do fluxo. Fase sem gasto sai fora. */
  async getForConcurso(concursoId: string): Promise<ConcursoCostReport> {
    const rows = await this.prisma.concursoAiCost.findMany({
      where: { concursoId },
      orderBy: { createdAt: 'asc' },
      select: { phase: true, usd: true, entries: true, createdAt: true },
    });

    const byPhase = PHASE_ORDER.map((phase) => {
      const runs = rows.filter((r) => r.phase === phase);
      return {
        phase,
        usd: runs.reduce((sum, r) => sum + Number(r.usd), 0),
        runs: runs.length,
        lastAt: runs.at(-1)?.createdAt.toISOString() ?? null,
        entries: runs.flatMap(
          (r) => (r.entries ?? []) as unknown as CostEntry[],
        ),
      };
    }).filter((p) => p.runs > 0);

    return {
      total: byPhase.reduce((sum, p) => sum + p.usd, 0),
      byPhase,
    };
  }
}
