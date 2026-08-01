import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentScraperService } from './document-scraper.service';
import {
  ConcursoDocumentAnalysisService,
  type ApplyChangeInput,
  type SyllabusInput,
} from './concurso-document-analysis.service';

/** Uma mudança aplicada num campo de cargo/concurso, para o relatório. */
export interface UpdateChange {
  /** Documento que originou a mudança. */
  docTitle: string;
  target: 'concurso' | 'cargo';
  /** Nome do cargo (quando target = cargo). */
  cargoRole: string | null;
  /** Rótulo legível do campo (ex.: "Fim das inscrições"). */
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Relatório do "Atualizar" de UM concurso. */
export interface ConcursoUpdateReport {
  concursoId: string;
  institution: string;
  /** Preenchido quando o concurso foi pulado (não processado). */
  skipped?: 'encerrado' | 'sem-origem';
  /** Erro da Fase 1 (raspagem bloqueada etc.) — não impede a Fase 2. */
  error?: string;
  docsAdded: number;
  docsAnalyzed: number;
  /** Total de itens aplicados (campos + cronograma + quadros). */
  itemsApplied: number;
  /** Detalhe campo-a-campo das mudanças aplicadas. */
  changes: UpdateChange[];
}

/**
 * "Atualizar concursos" (em massa, /admin/gerenciar-concursos): roda o pipeline
 * de monitoramento por concurso — Fase 1 (adiciona os documentos novos à
 * timeline) + Fase 2 (lê cada documento ainda não analisado, do mais antigo ao
 * mais novo, e AUTO-APLICA as mudanças de cargo/concurso). Devolve um relatório
 * do que mudou. O front chama isto 1x por concurso (sequencial, com progresso).
 */
@Injectable()
export class ConcursoUpdateService {
  private readonly logger = new Logger(ConcursoUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docScraper: DocumentScraperService,
    private readonly analysis: ConcursoDocumentAnalysisService,
  ) {}

  async updateOne(concursoId: string): Promise<ConcursoUpdateReport> {
    const concurso = await this.prisma.concurso.findUnique({
      where: { id: concursoId },
      select: {
        id: true,
        institution: true,
        documentsSourceUrl: true,
        closedAt: true,
      },
    });
    if (!concurso) throw new NotFoundException('concurso não encontrado');

    const report: ConcursoUpdateReport = {
      concursoId,
      institution: concurso.institution,
      docsAdded: 0,
      docsAnalyzed: 0,
      itemsApplied: 0,
      changes: [],
    };
    // Encerrado ou sem página de origem → nada a fazer.
    if (concurso.closedAt) return { ...report, skipped: 'encerrado' };
    if (!concurso.documentsSourceUrl)
      return { ...report, skipped: 'sem-origem' };

    // Fase 1: re-raspa a origem e adiciona os documentos NOVOS à timeline.
    // Uma raspagem bloqueada (Cloudflare) não impede analisar o que já existe.
    try {
      const check = await this.docScraper.checkConcursoDocuments(concursoId);
      const novos = check.documents.filter((d) => d.isNew && d.url);
      if (novos.length > 0) {
        const added = await this.docScraper.addConcursoDocuments(
          concursoId,
          novos.map((d) => ({
            title: d.name,
            summary: d.summary,
            url: d.url!,
            kind: d.kind,
            publishedAt: d.publishedAt,
          })),
        );
        report.docsAdded = added.addedCount;
      }
    } catch (err) {
      report.error = (err as Error).message?.slice(0, 200);
      this.logger.warn(
        `update ${concurso.institution} — fase 1 falhou: ${report.error}`,
      );
    }

    // Fase 2: lê cada documento AINDA NÃO analisado, do mais antigo ao mais novo,
    // e auto-aplica as mudanças que ele determina. `analyzedAt` evita re-ler.
    const docs = await this.prisma.concursoDocument.findMany({
      where: { concursoId, analyzedAt: null },
      orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true },
    });

    for (const doc of docs) {
      try {
        const r = await this.analysis.analyze(concursoId, doc.id);
        const changes: ApplyChangeInput[] = r.changes.map((c) => ({
          target: c.target,
          cargoId: c.cargoId,
          field: c.field,
          newValue: c.newValue,
        }));
        const syllabus: SyllabusInput[] | null =
          r.syllabus?.map((s) => ({ cargoId: s.cargoId, groups: s.groups })) ??
          null;
        const applied = await this.analysis.apply(
          concursoId,
          doc.id,
          changes,
          r.cronograma,
          syllabus,
        );
        report.docsAnalyzed++;
        report.itemsApplied += applied.appliedCount;
        for (const c of r.changes) {
          report.changes.push({
            docTitle: doc.title,
            target: c.target,
            cargoRole: c.cargoRole,
            label: c.label,
            oldValue: c.currentValue,
            newValue: c.newValue,
          });
        }
      } catch (err) {
        // Um PDF bloqueado/ilegível não derruba o resto do concurso.
        this.logger.warn(
          `update ${concurso.institution} — doc ${doc.id} falhou: ${(err as Error).message?.slice(0, 160)}`,
        );
      }
    }

    return report;
  }
}
