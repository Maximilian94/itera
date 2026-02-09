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

/** Per-question detail for AI feedback (topic, subtopics, correctness). */
type SubjectQuestionDetail = {
  topic: string | null;
  subtopics: string[];
  correct: boolean;
  answered: boolean;
};

/** AI-generated feedback for a subject (evaluation + recommendations). */
type SubjectFeedbackFromAI = {
  evaluation: string;
  recommendations: string;
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
            examBoard: { select: { id: true, name: true, logoUrl: true } },
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

      let percentage: number | null = null;
      let passed: boolean | null = null;

      if (a.finishedAt != null && examBase) {
        const total = questionsByBase.filter(
          (q) => q.examBaseId === a.examBaseId,
        ).length;
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

      return {
        id: a.id,
        examBaseId: a.examBaseId,
        startedAt: a.startedAt,
        finishedAt: a.finishedAt,
        examBaseName: examBase.name,
        institution: examBase.institution ?? null,
        examDate: examBase.examDate,
        examBoardName: examBase.examBoard?.name ?? null,
        examBoardId: examBase.examBoardId ?? null,
        examBoardLogoUrl: examBase.examBoard?.logoUrl ?? null,
        state: examBase.state ?? null,
        city: examBase.city ?? null,
        minPassingGradeNonQuota: minPassing,
        percentage,
        passed,
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

  async create(examBaseId: string, userId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const attempt = await this.prisma.examBaseAttempt.create({
      data: {
        examBaseId,
        userId,
      },
      select: {
        id: true,
        examBaseId: true,
        startedAt: true,
      },
    });
    return attempt;
  }

  async getOneWithQuestionsAndAnswers(
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

    const questions = await this.prisma.examBaseQuestion.findMany({
      where: { examBaseId },
      orderBy: { createdAt: 'asc' },
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

    const data = await this.getOneWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );
    const { subjectStats, bySubjectDetails } = this.computeSubjectStats(
      data.questions,
      data.answers,
    );
    const totalCorrect = subjectStats.reduce((acc, s) => acc + s.correct, 0);
    const totalQuestions = subjectStats.reduce((acc, s) => acc + s.total, 0);
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
    if (apiKey && subjectStats.length > 0) {
      try {
        subjectFeedback = await this.generateSubjectFeedbackWithAI(
          subjectStats,
          bySubjectDetails,
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
   * Computes per-subject correct/total/percentage and question details
   * for AI feedback generation.
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
    subjectStats: Array<{
      subject: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    bySubjectDetails: Record<string, SubjectQuestionDetail[]>;
  } {
    const bySubject: Record<string, { correct: number; total: number }> = {};
    const bySubjectDetails: Record<string, SubjectQuestionDetail[]> = {};
    let totalCorrect = 0;

    for (const q of questions) {
      const subject = q.subject ?? 'Sem matéria';
      if (!bySubject[subject]) bySubject[subject] = { correct: 0, total: 0 };
      bySubject[subject].total += 1;

      const selectedId = answers[q.id] ?? null;
      if (selectedId != null && selectedId !== '') {
        const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
        const correctId = correctAlt?.id ?? null;
        if (correctId != null && selectedId === correctId) {
          bySubject[subject].correct += 1;
          totalCorrect += 1;
        }
      }

      if (!bySubjectDetails[subject]) bySubjectDetails[subject] = [];
      const answered = selectedId != null && selectedId !== '';
      let correct = false;
      if (answered) {
        const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
        const correctId = correctAlt?.id ?? null;
        correct = correctId != null && selectedId === correctId;
      }
      bySubjectDetails[subject].push({
        topic: q.topic ?? null,
        subtopics: q.subtopics ?? [],
        correct,
        answered,
      });
    }

    const subjectStats = Object.entries(bySubject).map(
      ([subject, { correct, total }]) => ({
        subject,
        correct,
        total,
        percentage: total > 0 ? (correct / total) * 100 : 0,
      }),
    );
    return { subjectStats, bySubjectDetails };
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
    const data = await this.getOneWithQuestionsAndAnswers(
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

    const { subjectStats, bySubjectDetails } = this.computeSubjectStats(
      data.questions,
      data.answers,
    );

    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Cannot generate AI feedback.',
      );
    }
    if (subjectStats.length === 0) {
      return { generated: false, message: 'No subjects to generate feedback for.' };
    }

    const subjectFeedback = await this.generateSubjectFeedbackWithAI(
      subjectStats,
      bySubjectDetails,
      minPassing,
    );

    await this.prisma.examBaseAttempt.update({
      where: { id: attemptId },
      data: { subjectFeedback: subjectFeedback as object },
    });
    await this.upsertSubjectFeedbackTable(attemptId, subjectFeedback);

    return { generated: true, subjectFeedback };
  }

  /** Persist subject feedback to SubjectFeedback table (one row per subject). */
  private async upsertSubjectFeedbackTable(
    attemptId: string,
    subjectFeedback: Record<string, SubjectFeedbackFromAI>,
  ): Promise<void> {
    for (const [subject, fb] of Object.entries(subjectFeedback)) {
      await this.prisma.subjectFeedback.upsert({
        where: {
          examBaseAttemptId_subject: { examBaseAttemptId: attemptId, subject },
        },
        create: {
          examBaseAttemptId: attemptId,
          subject,
          evaluation: fb.evaluation,
          recommendations: fb.recommendations,
        },
        update: {
          evaluation: fb.evaluation,
          recommendations: fb.recommendations,
        },
      });
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
    const data = await this.getOneWithQuestionsAndAnswers(
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

    const { subjectStats } = this.computeSubjectStats(
      data.questions,
      data.answers,
    );
    const total = data.questions.length;
    const totalCorrect = subjectStats.reduce(
      (sum, s) => sum + s.correct,
      0,
    );
    const overallPercentage = total > 0 ? (totalCorrect / total) * 100 : 0;
    const passed = overallPercentage >= minPassing;

    const subjectFeedbackRows = await this.prisma.subjectFeedback.findMany({
      where: { examBaseAttemptId: attemptId },
      select: { subject: true, evaluation: true, recommendations: true },
    });
    const subjectFeedback: Record<string, { evaluation: string; recommendations: string }> =
      subjectFeedbackRows.length > 0
        ? Object.fromEntries(
            subjectFeedbackRows.map((row) => [
              row.subject,
              { evaluation: row.evaluation, recommendations: row.recommendations },
            ]),
          )
        : (attempt.subjectFeedback as Record<
            string,
            { evaluation: string; recommendations: string }
          >) ?? {};

    return {
      examTitle: examBase.name,
      minPassingGradeNonQuota: minPassing,
      overall: {
        correct: totalCorrect,
        total,
        percentage: overallPercentage,
      },
      passed,
      subjectStats,
      subjectFeedback,
    };
  }

  /**
   * Calls xAI (Grok) to generate evaluation + recommendations per subject.
   * Uses topic/subtopics and correct/answered per question for context.
   */
  private async generateSubjectFeedbackWithAI(
    subjectStats: Array<{
      subject: string;
      correct: number;
      total: number;
      percentage: number;
    }>,
    bySubjectDetails: Record<string, SubjectQuestionDetail[]>,
    minPassingGrade: number,
  ): Promise<Record<string, SubjectFeedbackFromAI>> {
    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) return {};

    const payload = subjectStats.map((s) => ({
      subject: s.subject,
      correct: s.correct,
      total: s.total,
      percentage: s.percentage,
      questions: bySubjectDetails[s.subject] ?? [],
    }));

    const systemPrompt = `Você é um tutor especializado em preparação para concursos e vestibulares. Sua tarefa é gerar feedback personalizado para o aluno sobre seu desempenho em cada matéria da prova.

Cada questão tem: topic (assunto), subtopics (subassuntos), correct (acertou), answered (respondeu ou deixou em branco).

Para cada matéria, retorne um objeto JSON com:
- "evaluation": Avaliação HONESTA e CONSTRUTIVA. Reconheça pontos fortes e fracos. Use topic e subtopics para identificar padrões. Se houver questões em branco, mencione isso.
- "recommendations": Recomendações APENAS sobre assuntos e subassuntos a estudar, com dicas sobre o conteúdo. NÃO sugira fontes (livros, sites, cursos), NÃO sugira horas de estudo. Foque em: quais assuntos/subassuntos priorizar e dicas sobre esses tópicos.

REGRAS DE FORMATAÇÃO (obrigatório):
1. NÃO use títulos em Markdown (nada de # ou ##). O título da matéria já existe na tela; títulos grandes no texto ficam maiores que ele e poluem a leitura.
2. Use SEMPRE bullet points para listas: comece cada item com "- " (hífen e espaço). Exemplo: "- Primeiro item\\n- Segundo item".
3. Pode usar **negrito** para destacar termos importantes (nomes de assuntos, subassuntos).
4. Espaçamento: use exatamente uma linha em branco (\\n\\n) entre parágrafos. Não use múltiplas linhas em branco nem espaços extras no início/fim de linhas. Isso evita texto desalinhado.
5. O feedback deve dar MUITO VALOR ao aluno. Seja encorajador, mas não falseie a avaliação.`;

    const userPrompt = `Nota mínima para aprovação: ${minPassingGrade}%.

Dados de desempenho por matéria:
${JSON.stringify(payload, null, 2)}

Retorne APENAS um JSON object: chaves = nomes das matérias (exatamente como no payload), valores = objetos com "evaluation" e "recommendations" (strings em português).

Formato do texto:
- Sem # ou ## (sem títulos grandes).
- Listas em bullet points com "- ".
- Parágrafos separados por \\n\\n.
- Recomendações: só assuntos/subassuntos e dicas sobre o conteúdo; sem fontes de estudo, sem horas.

Exemplo:
{"Matemática":{"evaluation":"Você acertou bem **Geometria** e teve dificuldade em **Álgebra**.\\n\\n- Pontos fortes: triângulos e áreas.\\n- Atenção: equações e funções.","recommendations":"- **Equações do 1º grau**: revisar isolamento de incógnita.\\n- **Funções**: praticar leitura de gráficos.\\n- **Geometria plana**: manter o ritmo, reforçar áreas de figuras compostas."},"Português":{"evaluation":"...","recommendations":"..."}}`;

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

    let parsed: Record<string, { evaluation?: string; recommendations?: string }>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return {};
    }

    const result: Record<string, SubjectFeedbackFromAI> = {};
    for (const s of subjectStats) {
      const fb = parsed[s.subject];
      if (fb && typeof fb.evaluation === 'string' && typeof fb.recommendations === 'string') {
        result[s.subject] = {
          evaluation: fb.evaluation,
          recommendations: fb.recommendations,
        };
      }
    }
    return result;
  }
}
