import { Prisma } from '@prisma/client';

/**
 * Cláusula `where` canônica para "edições anteriores do mesmo cargo":
 * mesma instituição + banca + role, com `examDate` estritamente anterior ao
 * ano da prova de referência (a régua é o ano-calendário, a mesma chave de
 * agrupamento do concurso — edições do próprio ano são siblings, não
 * histórico). Só cargos nursing-relevant entram; provas não publicadas só
 * aparecem para admin.
 *
 * Compartilhada por `getCargoDetail` (previousExams, MAX-16), pela
 * distribuição histórica de matérias (MAX-17) e pela concorrência histórica
 * (MAX-18) — mudou a regra de match, mudou para todo mundo.
 */
export function previousEditionsWhere(input: {
  institution: string;
  examBoardId: string | null;
  role: string;
  /** Ano da prova de referência; edições retornadas são de anos anteriores. */
  examYear: number;
  showUnpublished: boolean;
}): Prisma.ExamBaseWhereInput {
  return {
    institution: input.institution,
    examBoardId: input.examBoardId,
    role: input.role,
    examDate: { lt: new Date(Date.UTC(input.examYear, 0, 1)) },
    isNursingRelevant: true,
    ...(input.showUnpublished ? {} : { published: true }),
  };
}
