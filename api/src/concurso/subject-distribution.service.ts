import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { deriveConcursoStatus } from './concurso-status';
import { previousEditionsWhere } from './previous-editions';

/**
 * Mínimo de respostas do usuário numa matéria para o acerto dela ser
 * exibido — evita que 1/2 respondidas vire "50% de acerto".
 */
const MIN_ANSWERS_PER_SUBJECT = 5;

/**
 * Rótulo do balde de questões sem `subject`. Decisão documentada (MAX-17):
 * se as questões sem matéria passam de OTHERS_MIN_SHARE do total, elas são
 * honestas demais para sumir e entram como "Outros"; abaixo disso são ruído
 * de cadastro e saem do cálculo inteiro (o `totalQuestions` é reduzido junto,
 * mantendo soma de counts = total).
 */
const OTHERS_LABEL = 'Outros';
const OTHERS_MIN_SHARE = 0.05;

/**
 * "Leitura do treinador": `topSubjects` é o menor prefixo (count desc) cuja
 * participação acumulada atinge TOP_SHARE_TARGET, limitado a MAX_TOP_SUBJECTS
 * — vira a frase "X e Y concentram N% da prova". "Outros" nunca entra no
 * insight: não é uma matéria acionável.
 */
const TOP_SHARE_TARGET = 0.5;
const MAX_TOP_SUBJECTS = 3;

export type SubjectDistributionMode = 'actual' | 'historical';

export interface SubjectDistribution {
  mode: SubjectDistributionMode;
  sourceExams: { examBaseId: string; year: number }[];
  totalQuestions: number;
  subjects: {
    subject: string;
    count: number;
    share: number;
    userAccuracy: number | null;
  }[];
  insight: {
    topSubjects: string[];
    topShare: number;
    weakestRelevant: { subject: string; accuracy: number } | null;
  };
}

/**
 * Distribuição de questões por matéria de uma prova (MAX-17), alimentando o
 * bloco de matérias do nível 2:
 *
 * - Prova **passada** → `mode: "actual"`: distribuição real das questões
 *   desta prova ("O que caiu na prova").
 * - Prova **futura** → `mode: "historical"`: agregado das edições anteriores
 *   do mesmo cargo + banca + instituição ("O que a banca costuma cobrar").
 *
 * Em ambos, cada matéria carrega o acerto do usuário logado nas tentativas
 * finalizadas das provas-fonte; anônimo recebe o mesmo payload com
 * `userAccuracy: null` e o insight degradado para só `topSubjects`.
 */
@Injectable()
export class SubjectDistributionService {
  constructor(private readonly prisma: PrismaService) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

  async getSubjectDistribution(
    examBaseId: string,
    userId?: string,
  ): Promise<SubjectDistribution> {
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

    // O backend decide o modo pela examDate (mesma régua day-granular do
    // status do concurso): prova já aplicada fala de fato, futura de padrão.
    const isPast =
      deriveConcursoStatus({
        registrationStart: null,
        registrationEnd: null,
        examDate: exam.examDate,
      }) === 'past';
    const mode: SubjectDistributionMode = isPast ? 'actual' : 'historical';

    // Provas-fonte: a própria prova (actual) ou as edições anteriores do
    // mesmo cargo/banca/instituição (historical, helper comum com
    // getCargoDetail e a concorrência histórica do MAX-18).
    // Sem institution não há como agrupar edições com honestidade → vazio.
    let sourceExams: { id: string; examDate: Date }[];
    if (mode === 'actual') {
      sourceExams = [{ id: exam.id, examDate: exam.examDate }];
    } else if (!exam.institution) {
      sourceExams = [];
    } else {
      sourceExams = await this.prisma.examBase.findMany({
        where: previousEditionsWhere({
          institution: exam.institution,
          examBoardId: exam.examBoardId,
          role: exam.role,
          examYear: exam.examDate.getUTCFullYear(),
          showUnpublished,
        }),
        orderBy: { examDate: 'desc' },
        select: { id: true, examDate: true },
      });
    }
    const sourceIds = sourceExams.map((s) => s.id);

    // Uma query agregada para a distribuição inteira (groupBy usa o índice
    // [examBaseId, subject]); nada por matéria.
    const grouped =
      sourceIds.length > 0
        ? await this.prisma.examBaseQuestion.groupBy({
            by: ['subject'],
            where: { examBaseId: { in: sourceIds } },
            _count: { id: true },
          })
        : [];

    const rawTotal = grouped.reduce((acc, g) => acc + g._count.id, 0);
    const nullCount = grouped.find((g) => g.subject == null)?._count.id ?? 0;
    // Ver doc de OTHERS_LABEL: balde "Outros" só quando relevante (>5%);
    // senão as sem-matéria saem do total para manter soma de counts = total.
    const includeOthers =
      rawTotal > 0 && nullCount / rawTotal > OTHERS_MIN_SHARE;
    const totalQuestions = includeOthers ? rawTotal : rawTotal - nullCount;

    const counts = new Map<string, number>();
    for (const g of grouped) {
      if (g.subject != null) counts.set(g.subject, g._count.id);
      else if (includeOthers) counts.set(OTHERS_LABEL, g._count.id);
    }

    const accuracyBySubject = await this.getUserAccuracyBySubject(
      userId,
      sourceIds,
      includeOthers,
    );

    const subjects = [...counts.entries()]
      .sort(([sa, ca], [sb, cb]) => cb - ca || sa.localeCompare(sb))
      .map(([subject, count]) => ({
        subject,
        count,
        // Razão crua; arredondamento é responsabilidade do front.
        share: totalQuestions > 0 ? count / totalQuestions : 0,
        userAccuracy: accuracyBySubject.get(subject) ?? null,
      }));

    // Insight pré-computado para a "leitura do treinador"; "Outros" fica de
    // fora por não ser acionável. weakestRelevant = maior peso × pior acerto
    // ("comece por ela"); null sem tentativas suficientes (insight degrada
    // para só topSubjects no anônimo).
    const named = subjects.filter((s) => s.subject !== OTHERS_LABEL);
    const topSubjects: string[] = [];
    let topShare = 0;
    for (const s of named) {
      if (
        topShare >= TOP_SHARE_TARGET ||
        topSubjects.length >= MAX_TOP_SUBJECTS
      )
        break;
      topSubjects.push(s.subject);
      topShare += s.share;
    }
    const weakestRelevant =
      named
        .filter((s) => s.userAccuracy != null)
        .map((s) => ({
          subject: s.subject,
          accuracy: s.userAccuracy!,
          priority: s.share * (1 - s.userAccuracy!),
        }))
        .sort((a, b) => b.priority - a.priority)
        .map(({ subject, accuracy }) => ({ subject, accuracy }))[0] ?? null;

    return {
      mode,
      sourceExams: sourceExams.map((s) => ({
        examBaseId: s.id,
        year: s.examDate.getUTCFullYear(),
      })),
      totalQuestions,
      subjects,
      insight: { topSubjects, topShare, weakestRelevant },
    };
  }

  /**
   * Acerto do usuário por matéria nas respostas efetivamente marcadas das
   * tentativas finalizadas das provas-fonte. Fração 0..1; `null` (ausente do
   * mapa) abaixo de MIN_ANSWERS_PER_SUBJECT respostas. Questões sem matéria
   * contam para "Outros" apenas quando o balde existe na distribuição.
   */
  private async getUserAccuracyBySubject(
    userId: string | undefined,
    sourceIds: string[],
    includeOthers: boolean,
  ): Promise<Map<string, number>> {
    const accuracyBySubject = new Map<string, number>();
    if (!userId || sourceIds.length === 0) return accuracyBySubject;

    const answers = await this.prisma.examBaseAttemptAnswer.findMany({
      where: {
        selectedAlternativeId: { not: null },
        examBaseAttempt: {
          userId,
          finishedAt: { not: null },
          examBaseId: { in: sourceIds },
        },
      },
      select: {
        selectedAlternative: { select: { key: true } },
        examBaseQuestion: {
          select: { subject: true, correctAlternative: true },
        },
      },
    });

    const tallies = new Map<string, { answered: number; correct: number }>();
    for (const a of answers) {
      const { subject, correctAlternative } = a.examBaseQuestion;
      if (!correctAlternative) continue;
      const bucket = subject ?? (includeOthers ? OTHERS_LABEL : null);
      if (!bucket) continue;
      const acc = tallies.get(bucket) ?? { answered: 0, correct: 0 };
      acc.answered += 1;
      if (a.selectedAlternative?.key === correctAlternative) acc.correct += 1;
      tallies.set(bucket, acc);
    }
    for (const [subject, t] of tallies) {
      if (t.answered >= MIN_ANSWERS_PER_SUBJECT)
        accuracyBySubject.set(subject, t.correct / t.answered);
    }
    return accuracyBySubject;
  }
}
