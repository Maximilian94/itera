import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { previousEditionsWhere } from './previous-editions';

/**
 * Uma edição anterior do cargo na tabela de concorrência histórica (MAX-18).
 *
 * Decisão mínimo × corte real (documentada aqui de propósito): o schema tem
 * `minPassingGradeNonQuota`, que é a nota MÍNIMA exigida pelo edital — NÃO a
 * nota de corte real da última vaga. Apresentar o mínimo como corte enganaria
 * o usuário sobre a dificuldade real. Por isso o payload expõe os dois campos
 * com nomes honestos:
 *
 * - `minPassingGrade`  → mínimo do edital (front rotula como "nota mínima");
 * - `actualCutScore`   → corte REAL da última vaga, preenchido manualmente
 *                        quando o resultado sai (null até lá).
 */
export interface CompetitionHistoryEdition {
  examBaseId: string;
  year: number;
  /** Total de inscritos no cargo (ExamBase.applicantCount). */
  applicantCount: number | null;
  vacancyCount: number | null;
  /** Candidatos por vaga, arredondado; null se faltar inscritos ou vagas. */
  perVacancy: number | null;
  /** Nota MÍNIMA do edital (não é o corte real — ver doc da interface). */
  minPassingGrade: string | null;
  /** Nota de corte REAL da última vaga; preenchimento manual futuro. */
  actualCutScore: string | null;
}

export interface CompetitionHistory {
  editions: CompetitionHistoryEdition[];
}

/**
 * Concorrência histórica por cargo (MAX-18): por edição anterior do mesmo
 * cargo na mesma instituição + banca — ano, inscritos, candidatos/vaga e
 * notas (mínima do edital + corte real quando houver). Alimenta a tabela
 * "Concorrência histórica" do nível 2.
 *
 * Edições sem nenhum dado de concorrência (sem inscritos E sem nota alguma)
 * ficam fora da lista; `editions: []` faz o front esconder a seção inteira.
 */
@Injectable()
export class CompetitionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

  async getCompetitionHistory(
    examBaseId: string,
    userId?: string,
  ): Promise<CompetitionHistory> {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;

    const exam = await this.prisma.examBase.findFirst({
      where: {
        id: examBaseId,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
        institution: true,
        examBoardId: true,
        role: true,
        examDate: true,
      },
    });
    if (!exam) throw new NotFoundException('exam base not found');

    // Sem institution não há como casar edições com honestidade → lista
    // vazia (não 404), e o front esconde a seção.
    if (!exam.institution) return { editions: [] };

    const editions = await this.prisma.examBase.findMany({
      where: previousEditionsWhere({
        institution: exam.institution,
        examBoardId: exam.examBoardId,
        role: exam.role,
        examYear: exam.examDate.getUTCFullYear(),
        showUnpublished,
      }),
      orderBy: { examDate: 'desc' },
      select: {
        id: true,
        examDate: true,
        applicantCount: true,
        vacancyCount: true,
        minPassingGradeNonQuota: true,
        actualCutScore: true,
      },
    });

    return {
      editions: editions
        // Edição sem inscritos E sem nota alguma não diz nada sobre
        // concorrência — fica fora em vez de virar uma linha de nulls.
        .filter(
          (e) =>
            e.applicantCount != null ||
            e.minPassingGradeNonQuota != null ||
            e.actualCutScore != null,
        )
        .map((e) => ({
          examBaseId: e.id,
          year: e.examDate.getUTCFullYear(),
          applicantCount: e.applicantCount,
          vacancyCount: e.vacancyCount,
          perVacancy:
            e.applicantCount != null &&
            e.vacancyCount != null &&
            e.vacancyCount > 0
              ? Math.round(e.applicantCount / e.vacancyCount)
              : null,
          minPassingGrade:
            e.minPassingGradeNonQuota != null
              ? String(e.minPassingGradeNonQuota)
              : null,
          actualCutScore:
            e.actualCutScore != null ? String(e.actualCutScore) : null,
        })),
    };
  }
}
