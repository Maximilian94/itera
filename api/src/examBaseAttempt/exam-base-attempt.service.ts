import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAnswerDto } from './dto/upsert-answer.dto';

const questionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  examBaseId: true,
  subject: true,
  topic: true,
  subtopics: true,
  statement: true,
  statementImageUrl: true,
  referenceText: true,
  correctAlternative: true,
  skills: true,
  alternatives: {
    orderBy: { key: 'asc' as const },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      key: true,
      text: true,
      explanation: true,
    },
  },
} as const;

/** Per-question detail for AI feedback (id, topic, subtopics, correctness). */
type SubjectQuestionDetail = {
  id: string;
  topic: string | null;
  subtopics: string[];
  correct: boolean;
  answered: boolean;
};

/** One recommendation: title + deeper text + question IDs related to this topic. */
export type SubjectFeedbackRecommendationFromAI = {
  title: string;
  text: string;
  questionIds?: string[];
};

/** AI-generated feedback for a subject (evaluation + recommendations array). */
type SubjectFeedbackFromAI = {
  evaluation: string;
  recommendations: SubjectFeedbackRecommendationFromAI[];
};

@Injectable()
export class ExamBaseAttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Lists ExamBaseAttempts for the current user (for history page or attempts tab).
   * When examBaseId is provided, only attempts for that exam base are returned.
   * Ordered by when they were done (startedAt desc).
   * Includes exam base info (banca, instituição, data da prova) and for finished
   * attempts: score (percentage) and passed status.
   */
  async listHistory(userId: string, examBaseId?: string) {
    const attempts = await this.prisma.examBaseAttempt.findMany({
      where: { userId, ...(examBaseId != null ? { examBaseId } : {}) },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
        finishedAt: true,
        subjectFilter: true,
        scorePercentage: true,
        examBase: {
          select: {
            id: true,
            name: true,
            institution: true,
            examDate: true,
            minPassingGradeNonQuota: true,
            examBoardId: true,
            state: true,
            city: true,
            examBoard: { select: { id: true, name: true, alias: true, logoUrl: true } },
          },
        },
        answers: {
          select: {
            examBaseQuestionId: true,
            selectedAlternativeId: true,
          },
        },
      },
    });

    const examBaseIds = [...new Set(attempts.map((a) => a.examBaseId))];
    const questionsByBase = await this.prisma.examBaseQuestion.findMany({
      where: { examBaseId: { in: examBaseIds } },
      select: {
        id: true,
        examBaseId: true,
        subject: true,
        correctAlternative: true,
        alternatives: { select: { id: true, key: true } },
      },
    });

    const correctAltByQuestion = new Map<string, string>();
    for (const q of questionsByBase) {
      const alt = q.alternatives.find((a) => a.key === q.correctAlternative);
      if (alt) correctAltByQuestion.set(q.id, alt.id);
    }

    return attempts.map((a) => {
      const examBase = a.examBase;
      const minPassing =
        examBase.minPassingGradeNonQuota != null
          ? Number(examBase.minPassingGradeNonQuota)
          : 60;

      const subjectFilter = Array.isArray(a.subjectFilter)
        ? a.subjectFilter
        : [];
      const isPartial = subjectFilter.length > 0;

      let percentage: number | null = null;
      let passed: boolean | null = null;

      if (a.finishedAt != null && examBase) {
        // Use stored scorePercentage when available (always set by finish).
        // For partial exams, scorePercentage is already proportional (correct/total of filtered questions).
        const storedScore = a.scorePercentage != null
          ? Number(a.scorePercentage)
          : null;

        if (storedScore != null) {
          percentage = storedScore;
          passed = percentage >= minPassing;
        } else {
          // Fallback for older attempts without scorePercentage
          const baseQuestions = questionsByBase.filter(
            (q) => q.examBaseId === a.examBaseId,
          );
          const total = isPartial
            ? baseQuestions.filter(
                (q) => q.subject != null && subjectFilter.includes(q.subject),
              ).length
            : baseQuestions.length;
          let correct = 0;
          for (const ans of a.answers) {
            const correctId = correctAltByQuestion.get(ans.examBaseQuestionId);
            if (
              correctId != null &&
              ans.selectedAlternativeId != null &&
              ans.selectedAlternativeId === correctId
            ) {
              correct += 1;
            }
          }
          percentage = total > 0 ? (correct / total) * 100 : 0;
          passed = percentage >= minPassing;
        }
      }

      return {
        id: a.id,
        examBaseId: a.examBaseId,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        examBaseName: examBase.name,
        institution: examBase.institution ?? null,
        examDate: examBase.examDate,
        examBoardName: examBase.examBoard?.name ?? null,
        examBoardAlias: examBase.examBoard?.alias ?? null,
        examBoardId: examBase.examBoardId ?? null,
        examBoardLogoUrl: examBase.examBoard?.logoUrl ?? null,
        state: examBase.state ?? null,
        city: examBase.city ?? null,
        minPassingGradeNonQuota: minPassing,
        percentage,
        passed,
        isPartial,
      };
    });
  }

  async list(examBaseId: string, userId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const attempts = await this.prisma.examBaseAttempt.findMany({
      where: { examBaseId, userId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    return attempts;
  }

  async create(
    examBaseId: string,
    userId: string,
    dto?: { subjectFilter?: string[] },
  ) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const subjectFilter =
      dto?.subjectFilter && dto.subjectFilter.length > 0
        ? dto.subjectFilter
        : [];

    const attempt = await this.prisma.examBaseAttempt.create({
      data: {
        examBaseId,
        userId,
        subjectFilter,
      },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
      },
    });
    return attempt;
  }

  /**
   * Fetches an exam attempt with all questions and the user's answers.
   *
   * @param examBaseId - ID of the exam base (prova)
   * @param attemptId - ID of the attempt (tentativa)
   * @param userId - User ID (for authorization)
   * @returns Object with:
   *   - attempt: Attempt metadata (id, startedAt, finishedAt, subjectFeedback)
   *   - questions: All questions from the exam (statement, alternatives, topic, etc.)
   *   - answers: Map of questionId -> selectedAlternativeId (null = blank/not answered)
   */
  async getExamAttemptWithQuestionsAndAnswers(
    examBaseId: string,
    attemptId: string,
    userId: string,
  ) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examBaseId: true,
        userId: true,
        startedAt: true,
        finishedAt: true,
        subjectFeedback: true,
        subjectFilter: true,
        answers: {
          select: {
            examBaseQuestionId: true,
            selectedAlternativeId: true,
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');

    const subjectFilter = attempt.subjectFilter ?? [];
    const hasSubjectFilter =
      Array.isArray(subjectFilter) && subjectFilter.length > 0;

    const questions = await this.prisma.examBaseQuestion.findMany({
      where: {
        examBaseId,
        ...(hasSubjectFilter
          ? { subject: { in: subjectFilter } }
          : {}),
      },
      orderBy: { position: 'asc' },
      select: questionSelect,
    });

    const answers: Record<string, string | null> = {};
    for (const a of attempt.answers) {
      answers[a.examBaseQuestionId] = a.selectedAlternativeId;
    }

    return {
      attempt: {
        id: attempt.id,
        examBaseId: attempt.examBaseId,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        subjectFilter: attempt.subjectFilter ?? [],
        subjectFeedback: attempt.subjectFeedback as Record<
          string,
          { evaluation: string; recommendations: string }
        > | null,
      },
      questions,
      answers,
    };
  }

  async upsertAnswer(
    examBaseId: string,
    attemptId: string,
    userId: string,
    dto: UpsertAnswerDto,
  ) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, examBaseId: true, userId: true, finishedAt: true },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');
    if (attempt.finishedAt != null)
      throw new BadRequestException('attempt is already finished');

    const question = await this.prisma.examBaseQuestion.findUnique({
      where: { id: dto.questionId },
      select: { id: true, examBaseId: true },
    });
    if (!question || question.examBaseId !== examBaseId)
      throw new NotFoundException('question not found');

    if (dto.selectedAlternativeId != null && dto.selectedAlternativeId !== '') {
      const alt = await this.prisma.examBaseQuestionAlternative.findUnique({
        where: { id: dto.selectedAlternativeId },
        select: { examBaseQuestionId: true },
      });
      if (!alt || alt.examBaseQuestionId !== dto.questionId)
        throw new BadRequestException(
          'selectedAlternativeId does not belong to this question',
        );
    }

    const selectedId =
      dto.selectedAlternativeId && dto.selectedAlternativeId.trim() !== ''
        ? dto.selectedAlternativeId
        : null;

    await this.prisma.examBaseAttemptAnswer.upsert({
      where: {
        examBaseAttemptId_examBaseQuestionId: {
          examBaseAttemptId: attemptId,
          examBaseQuestionId: dto.questionId,
        },
      },
      create: {
        examBaseAttemptId: attemptId,
        examBaseQuestionId: dto.questionId,
        selectedAlternativeId: selectedId,
      },
      update: { selectedAlternativeId: selectedId },
    });

    return {
      questionId: dto.questionId,
      selectedAlternativeId: selectedId,
    };
  }

  async finish(examBaseId: string, attemptId: string, userId: string) {
    const attempt = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, examBaseId: true, userId: true, finishedAt: true },
    });

    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.examBaseId !== examBaseId)
      throw new NotFoundException('attempt not found');
    if (attempt.userId !== userId)
      throw new ForbiddenException('attempt does not belong to user');
    if (attempt.finishedAt != null)
      throw new BadRequestException('attempt is already finished');

    const data = await this.getExamAttemptWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );
    const { subjectPerformanceSummary, questionDetailsBySubject } =
      this.computeSubjectStats(data.questions, data.answers);
    const totalCorrect = subjectPerformanceSummary.reduce(
      (acc, s) => acc + s.correct,
      0,
    );
    const totalQuestions = subjectPerformanceSummary.reduce(
      (acc, s) => acc + s.total,
      0,
    );
    const scorePercentage =
      totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    await this.prisma.examBaseAttempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        scorePercentage,
      },
    });

    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { minPassingGradeNonQuota: true },
    });
    const minPassing =
      examBase?.minPassingGradeNonQuota != null
        ? Number(examBase.minPassingGradeNonQuota)
        : 60;

    let subjectFeedback: Record<string, SubjectFeedbackFromAI> = {};
    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (apiKey && subjectPerformanceSummary.length > 0) {
      try {
        subjectFeedback = await this.generateSubjectFeedbackWithAI(
          subjectPerformanceSummary,
          questionDetailsBySubject,
          minPassing,
        );
        await this.prisma.examBaseAttempt.update({
          where: { id: attemptId },
          data: { subjectFeedback: subjectFeedback as object },
        });
        await this.upsertSubjectFeedbackTable(attemptId, subjectFeedback);
      } catch (err) {
        console.error('AI subject feedback generation failed:', err);
      }
    }

    // If this attempt belongs to a training session, advance to DIAGNOSIS
    await this.prisma.trainingSession.updateMany({
      where: { examBaseAttemptId: attemptId },
      data: { currentStage: 'DIAGNOSIS' },
    });

    const updated = await this.prisma.examBaseAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    return updated!;
  }

  /**
   * Computes per-subject performance metrics and per-question metadata for AI feedback generation.
   *
   * @param questions - Exam questions with subject, topic, subtopics, and alternatives
   * @param answers - Map of questionId -> selectedAlternativeId (null = blank)
   * @returns Object with:
   *   - subjectPerformanceSummary: Aggregate stats per subject (correct, total, percentage).
   *     Used for score display and to tell the AI how the student performed in each subject.
   *   - questionDetailsBySubject: Per-question metadata grouped by subject. Each entry has
   *     topic, subtopics, correct, answered. Used by the AI to identify patterns (e.g. which
   *     topics were missed) and generate targeted recommendations.
   */
  private computeSubjectStats(
    questions: Array<{
      id: string;
      subject: string | null;
      topic: string | null;
      subtopics: string[];
      correctAlternative: string | null;
      alternatives: Array<{ id: string; key: string }>;
    }>,
    answers: Record<string, string | null>,
  ): {
    subjectPerformanceSummary: Array<{
      subject: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    questionDetailsBySubject: Record<string, SubjectQuestionDetail[]>;
  } {
    const correctTotalBySubject: Record<string, { correct: number; total: number }> = {};
    const questionDetailsBySubject: Record<string, SubjectQuestionDetail[]> = {};

    for (const q of questions) {
      const subject = q.subject ?? 'Sem matéria';
      if (!correctTotalBySubject[subject]) correctTotalBySubject[subject] = { correct: 0, total: 0 };
      correctTotalBySubject[subject].total += 1;

      const selectedId = answers[q.id] ?? null;
      if (selectedId != null && selectedId !== '') {
        const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
        const correctId = correctAlt?.id ?? null;
        if (correctId != null && selectedId === correctId) {
          correctTotalBySubject[subject].correct += 1;
        }
      }

      if (!questionDetailsBySubject[subject]) questionDetailsBySubject[subject] = [];
      const answered = selectedId != null && selectedId !== '';
      let correct = false;
      if (answered) {
        const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
        const correctId = correctAlt?.id ?? null;
        correct = correctId != null && selectedId === correctId;
      }
      questionDetailsBySubject[subject].push({
        id: q.id,
        topic: q.topic ?? null,
        subtopics: q.subtopics ?? [],
        correct,
        answered,
      });
    }

    const subjectPerformanceSummary = Object.entries(correctTotalBySubject).map(
      ([subject, { correct, total }]) => ({
        subject,
        correct,
        total,
        percentage: total > 0 ? (correct / total) * 100 : 0,
      }),
    );
    return { subjectPerformanceSummary, questionDetailsBySubject };
  }

  /**
   * Public helper: compute per-subject stats from questions and answers map.
   * Used by training getFinal to get initial and final (after retry) subject stats.
   */
  getSubjectStats(
    questions: Array<{
      id: string;
      subject: string | null;
      topic: string | null;
      subtopics: string[];
      correctAlternative: string | null;
      alternatives: Array<{ id: string; key: string }>;
    }>,
    answers: Record<string, string | null>,
  ): Array<{ subject: string; correct: number; total: number; percentage: number }> {
    const { subjectPerformanceSummary } = this.computeSubjectStats(
      questions,
      answers,
    );
    return subjectPerformanceSummary;
  }

  /**
   * Generates AI feedback per subject for a finished attempt.
   * Used for older attempts that don't have feedback, or to regenerate it.
   * Requires XAI_API_KEY. Saves result to subjectFeedback column.
   *
   * @throws BadRequestException if attempt is not finished or XAI_API_KEY is missing
   */
  async generateSubjectFeedback(
    examBaseId: string,
    attemptId: string,
    userId: string,
  ) {
    const data = await this.getExamAttemptWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );
    const attempt = data.attempt;
    if (attempt.finishedAt == null) {
      throw new BadRequestException(
        'feedback can only be generated for finished attempts',
      );
    }

    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { minPassingGradeNonQuota: true },
    });
    const minPassing =
      examBase?.minPassingGradeNonQuota != null
        ? Number(examBase.minPassingGradeNonQuota)
        : 60;

    const { subjectPerformanceSummary, questionDetailsBySubject } =
      this.computeSubjectStats(data.questions, data.answers);

    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Cannot generate AI feedback.',
      );
    }
    if (subjectPerformanceSummary.length === 0) {
      return { generated: false, message: 'No subjects to generate feedback for.' };
    }

    const subjectFeedback = await this.generateSubjectFeedbackWithAI(
      subjectPerformanceSummary,
      questionDetailsBySubject,
      minPassing,
    );

    await this.prisma.examBaseAttempt.update({
      where: { id: attemptId },
      data: { subjectFeedback: subjectFeedback as object },
    });
    await this.upsertSubjectFeedbackTable(attemptId, subjectFeedback);

    return { generated: true, subjectFeedback };
  }

  /** Persist subject feedback to SubjectFeedback table + SubjectFeedbackRecommendation rows + question links. */
  private async upsertSubjectFeedbackTable(
    attemptId: string,
    subjectFeedback: Record<string, SubjectFeedbackFromAI>,
  ): Promise<void> {
    for (const [subject, fb] of Object.entries(subjectFeedback)) {
      const sf = await this.prisma.subjectFeedback.upsert({
        where: {
          examBaseAttemptId_subject: { examBaseAttemptId: attemptId, subject },
        },
        create: {
          examBaseAttemptId: attemptId,
          subject,
          evaluation: fb.evaluation,
        },
        update: { evaluation: fb.evaluation },
      });
      await this.prisma.subjectFeedbackRecommendation.deleteMany({
        where: { subjectFeedbackId: sf.id },
      });
      if (Array.isArray(fb.recommendations) && fb.recommendations.length > 0) {
        for (let idx = 0; idx < fb.recommendations.length; idx++) {
          const rec = fb.recommendations[idx];
          const recRow = await this.prisma.subjectFeedbackRecommendation.create({
            data: {
              subjectFeedbackId: sf.id,
              title: typeof rec.title === 'string' ? rec.title.slice(0, 500) : 'Recomendação',
              text: typeof rec.text === 'string' ? rec.text : '',
              order: idx,
            },
          });
          const questionIds = Array.isArray(rec.questionIds) ? rec.questionIds : [];
          if (questionIds.length > 0) {
            await this.prisma.subjectFeedbackRecommendationQuestionLink.createMany({
              data: questionIds.map((questionId) => ({
                subjectFeedbackRecommendationId: recRow.id,
                examBaseQuestionId: questionId,
              })),
              skipDuplicates: true,
            });
          }
        }
      }
    }
  }

  /**
   * Returns full feedback for a finished attempt: overall stats, per-subject stats,
   * and stored AI-generated subject feedback (if any).
   */
  async getFeedback(
    examBaseId: string,
    attemptId: string,
    userId: string,
  ) {
    const data = await this.getExamAttemptWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );

    const attempt = data.attempt;
    if (attempt.finishedAt == null) {
      throw new BadRequestException(
        'feedback only available for finished attempts',
      );
    }

    const subjectFilter = Array.isArray(data.attempt.subjectFilter)
      ? data.attempt.subjectFilter
      : [];
    const isPartial = subjectFilter.length > 0;

    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: {
        name: true,
        minPassingGradeNonQuota: true,
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const minPassing =
      examBase.minPassingGradeNonQuota != null
        ? Number(examBase.minPassingGradeNonQuota)
        : 60;

    const { subjectPerformanceSummary } = this.computeSubjectStats(
      data.questions,
      data.answers,
    );
    const total = data.questions.length;
    const totalCorrect = subjectPerformanceSummary.reduce(
      (sum, s) => sum + s.correct,
      0,
    );
    const overallPercentage = total > 0 ? (totalCorrect / total) * 100 : 0;
    const passed = overallPercentage >= minPassing;

    const subjectFeedbackRows = await this.prisma.subjectFeedback.findMany({
      where: { examBaseAttemptId: attemptId },
      select: {
        subject: true,
        evaluation: true,
        recommendations: { orderBy: { order: 'asc' }, select: { title: true, text: true } },
      },
    });
    const subjectFeedback: Record<
      string,
      { evaluation: string; recommendations: Array<{ title: string; text: string }> }
    > =
      subjectFeedbackRows.length > 0
        ? Object.fromEntries(
            subjectFeedbackRows.map((row) => [
              row.subject,
              {
                evaluation: row.evaluation,
                recommendations: row.recommendations.map((r) => ({ title: r.title, text: r.text })),
              },
            ]),
          )
        : {};

    return {
      examTitle: examBase.name,
      minPassingGradeNonQuota: minPassing,
      overall: {
        correct: totalCorrect,
        total,
        percentage: overallPercentage,
      },
      passed,
      isPartial,
      subjectStats: subjectPerformanceSummary,
      subjectFeedback,
    };
  }

  /**
   * Calls xAI (Grok) to generate evaluation + recommendations per subject.
   * Uses topic/subtopics and correct/answered per question for context.
   */
  private async generateSubjectFeedbackWithAI(
    subjectPerformanceSummary: Array<{
      subject: string;
      correct: number;
      total: number;
      percentage: number;
    }>,
    questionDetailsBySubject: Record<string, SubjectQuestionDetail[]>,
    minPassingGrade: number,
  ): Promise<Record<string, SubjectFeedbackFromAI>> {
    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) return {};

    const payload = subjectPerformanceSummary.map((s) => ({
      subject: s.subject,
      correct: s.correct,
      total: s.total,
      percentage: s.percentage,
      questions: questionDetailsBySubject[s.subject] ?? [],
    }));

    const systemPrompt = `Você é um tutor especializado em preparação para concursos e vestibulares. Sua tarefa é gerar feedback personalizado para o aluno sobre seu desempenho em cada matéria da prova.

Cada questão tem: id (UUID da questão), topic (assunto), subtopics (subassuntos), correct (acertou), answered (respondeu ou deixou em branco).

Para cada matéria, retorne um objeto JSON com:
- "evaluation": Avaliação HONESTA e CONSTRUTIVA. Reconheça pontos fortes e fracos. Use topic e subtopics para identificar padrões. Se houver questões em branco, mencione isso.
- "recommendations": Array de objetos, cada um com "title" (título curto da recomendação, ex.: "Equações do 1º grau"), "text" (texto em português com uma recomendação mais profunda sobre esse assunto: o que priorizar, dicas de conteúdo) e "questionIds" (array com os IDs das questões ERRADAS ou EM BRANCO que se relacionam diretamente a este tema — use o campo "id" de cada questão no payload). NÃO sugira fontes (livros, sites, cursos), NÃO sugira horas de estudo. Gere de 2 a 5 recomendações por matéria.
- IMPORTANTE: Cada recomendação deve ter exatamente UM assunto/tópico no campo "title". NUNCA combine dois ou mais assuntos em um único título. Exemplo ERRADO: "Regência Verbal e Vícios de Linguagem" ou "Verbo haver e regência verbal". Exemplo CORRETO: duas recomendações separadas — "Regência Verbal" e "Vícios de Linguagem".
- IMPORTANTE: O campo "questionIds" deve conter APENAS IDs de questões que errou ou deixou em branco e que são diretamente relacionadas ao tema da recomendação. Use topic e subtopics das questões para decidir. Se nenhuma questão se relacionar, retorne array vazio [].

REGRAS DE FORMATAÇÃO (obrigatório):
1. NÃO use títulos em Markdown (nada de # ou ##) dentro de evaluation ou text. Pode usar **negrito** para destacar termos.
2. Use bullet points em listas com "- ". Parágrafos separados por \\n\\n.
3. O feedback deve dar MUITO VALOR ao aluno. Seja encorajador, mas não falseie a avaliação.`;

    const userPrompt = `Nota mínima para aprovação: ${minPassingGrade}%.

Dados de desempenho por matéria:
${JSON.stringify(payload, null, 2)}

Retorne APENAS um JSON object: chaves = nomes das matérias (exatamente como no payload), valores = objetos com "evaluation" (string) e "recommendations" (array de objetos com "title", "text" e "questionIds", em português).

Exemplo:
{"Matemática":{"evaluation":"Você acertou bem **Geometria** e teve dificuldade em **Álgebra**.\\n\\n- Pontos fortes: triângulos e áreas.\\n- Atenção: equações e funções.","recommendations":[{"title":"Equações do 1º grau","text":"Revisar isolamento de incógnita e equações simples. Pratique problemas que misturam frações e decimais.","questionIds":["uuid-questao-1","uuid-questao-2"]},{"title":"Funções","text":"Praticar leitura de gráficos e identificação de domínio e imagem. Foque em funções afim e quadráticas.","questionIds":["uuid-questao-3"]}]},"Português":{"evaluation":"...","recommendations":[{"title":"...","text":"...","questionIds":[]}]}}`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`xAI API error (${res.status}): ${errBody.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return {};

    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, { evaluation?: string; recommendations?: unknown }>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return {};
    }

    const validQuestionIdsBySubject = new Map<string, Set<string>>();
    for (const [subj, details] of Object.entries(questionDetailsBySubject)) {
      validQuestionIdsBySubject.set(
        subj,
        new Set(details.filter((d) => !d.correct).map((d) => d.id)),
      );
    }

    const result: Record<string, SubjectFeedbackFromAI> = {};
    for (const s of subjectPerformanceSummary) {
      const fb = parsed[s.subject];
      if (!fb || typeof fb.evaluation !== 'string') continue;
      const validIds = validQuestionIdsBySubject.get(s.subject) ?? new Set<string>();
      const recs = Array.isArray(fb.recommendations)
        ? (fb.recommendations as Array<{
            title?: unknown;
            text?: unknown;
            questionIds?: unknown;
          }>)
            .filter((r) => r && typeof r.title === 'string' && typeof r.text === 'string')
            .map((r) => {
              const rawIds = Array.isArray(r.questionIds)
                ? (r.questionIds as unknown[]).filter((id) => typeof id === 'string')
                : [];
              const questionIds = (rawIds as string[]).filter((id) =>
                validIds.has(id),
              );
              return {
                title: r.title as string,
                text: r.text as string,
                questionIds,
              };
            })
        : [];
      result[s.subject] = {
        evaluation: fb.evaluation,
        recommendations:
          recs.length > 0
            ? recs
            : [
                {
                  title: 'Recomendações',
                  text: 'Priorize os assuntos em que você teve mais dificuldade e revise os tópicos relacionados.',
                  questionIds: [],
                },
              ],
      };
    }
    return result;
  }
}
