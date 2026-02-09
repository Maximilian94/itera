import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrainingStage } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { ExamBaseAttemptService } from '../examBaseAttempt/exam-base-attempt.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { UpsertRetryAnswerDto } from './dto/upsert-retry-answer.dto';

const STAGE_ORDER: TrainingStage[] = [
  'EXAM',
  'DIAGNOSIS',
  'STUDY',
  'RETRY',
  'FINAL',
];

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly examBaseAttemptService: ExamBaseAttemptService,
  ) {}

  private async getSessionForUser(trainingId: string, userId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: trainingId },
      include: {
        examBaseAttempt: true,
        examBase: { select: { id: true, name: true, examBoardId: true } },
      },
    });
    if (!session) throw new NotFoundException('training session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('training session does not belong to user');
    return session;
  }

  private stageIndex(stage: TrainingStage): number {
    const idx = STAGE_ORDER.indexOf(stage);
    return idx >= 0 ? idx : -1;
  }

  /** List training sessions for the user, most recent first. */
  async list(userId: string) {
    const sessions = await this.prisma.trainingSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        examBase: { select: { id: true, name: true, examBoardId: true } },
        examBaseAttempt: { select: { id: true, finishedAt: true } },
      },
    });
    return sessions.map((s) => ({
      trainingId: s.id,
      examBaseId: s.examBaseId,
      examBoardId: s.examBase.examBoardId ?? null,
      examTitle: s.examBase.name,
      currentStage: s.currentStage,
      attemptId: s.examBaseAttempt.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      attemptFinishedAt: s.examBaseAttempt.finishedAt,
      finalScorePercentage:
        s.finalScorePercentage != null
          ? Number(s.finalScorePercentage)
          : null,
    }));
  }

  /** Create a new attempt and training session. Returns ids for frontend routing. */
  async create(examBaseId: string, userId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true, examBoardId: true },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const attempt = await this.prisma.examBaseAttempt.create({
      data: { examBaseId, userId },
      select: { id: true, examBaseId: true },
    });

    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        examBaseAttemptId: attempt.id,
        examBaseId: attempt.examBaseId,
        currentStage: 'EXAM',
      },
      select: { id: true },
    });

    return {
      trainingId: session.id,
      attemptId: attempt.id,
      examBaseId: attempt.examBaseId,
      examBoardId: examBase.examBoardId,
    };
  }

  /** Get session state and payload for current stage (e.g. feedback for DIAGNOSIS). */
  async getOne(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    const examBaseId = session.examBaseId;
    const attemptId = session.examBaseAttemptId;
    const attempt = session.examBaseAttempt;

    const studyItems = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      select: { id: true, subject: true, topic: true, completedAt: true },
    });
    const studyCompletedSubjects = studyItems
      .filter((i) => i.completedAt != null)
      .map((i) => i.subject);

    const base = {
      trainingId: session.id,
      currentStage: session.currentStage,
      attemptId,
      examBaseId,
      examBoardId: session.examBase.examBoardId ?? null,
      examTitle: session.examBase.name,
      studyCompletedSubjects,
      attemptFinishedAt: attempt.finishedAt,
    };

    // Return feedback whenever the attempt is finished (so Diagnóstico page can show it even if stage is still EXAM).
    if (attempt.finishedAt != null) {
      const feedback = await this.examBaseAttemptService.getFeedback(
        examBaseId,
        attemptId,
        userId,
      );
      return { ...base, feedback };
    }

    if (session.currentStage === 'FINAL' && session.finalScorePercentage != null) {
      const initialPercentage = attempt.scorePercentage != null ? Number(attempt.scorePercentage) : 0;
      const totalQuestions = await this.prisma.examBaseQuestion.count({
        where: { examBaseId },
      });
      const initialCorrect = totalQuestions > 0
        ? Math.round((initialPercentage / 100) * totalQuestions)
        : 0;
      const finalPercentage = Number(session.finalScorePercentage);
      const finalCorrect = totalQuestions > 0
        ? Math.round((finalPercentage / 100) * totalQuestions)
        : 0;
      const gainPoints = finalCorrect - initialCorrect;
      const gainPercent = Math.round(finalPercentage - initialPercentage);
      return {
        ...base,
        final: {
          initialPercentage,
          beforeStudyPercentage: initialPercentage,
          finalPercentage,
          initialCorrect,
          finalCorrect,
          totalQuestions,
          gainPoints,
          gainPercent,
          finalFeedback: session.finalFeedback ?? undefined,
        },
      };
    }

    return base;
  }

  /** Advance (or set) current stage. Validates order. On move to FINAL, computes and saves final score. */
  async updateStage(
    trainingId: string,
    userId: string,
    dto: UpdateStageDto,
  ) {
    const session = await this.getSessionForUser(trainingId, userId);
    const requested = dto.stage as TrainingStage;
    const currentIdx = this.stageIndex(session.currentStage);
    const requestedIdx = this.stageIndex(requested);
    if (requestedIdx < 0) throw new BadRequestException('invalid stage');
    if (requestedIdx < currentIdx)
      throw new BadRequestException('cannot go back to an earlier stage');

    const updates: { currentStage: TrainingStage; finalScorePercentage?: Decimal; finalFeedback?: string } = {
      currentStage: requested,
    };

    if (requested === 'FINAL') {
      const examBaseId = session.examBaseId;
      const attemptId = session.examBaseAttemptId;
      const attempt = await this.prisma.examBaseAttempt.findUnique({
        where: { id: attemptId },
        select: { scorePercentage: true },
      });
      const totalQuestions = await this.prisma.examBaseQuestion.count({
        where: { examBaseId },
      });
      if (attempt?.scorePercentage != null && totalQuestions > 0) {
        const initialCorrect = Math.round(
          (Number(attempt.scorePercentage) / 100) * totalQuestions,
        );
        const retryAnswers = await this.prisma.trainingRetryAnswer.findMany({
          where: { trainingSessionId: trainingId },
          select: {
            examBaseQuestionId: true,
            selectedAlternativeId: true,
            examBaseQuestion: {
              select: {
                correctAlternative: true,
                alternatives: { select: { id: true, key: true } },
              },
            },
          },
        });
        let retryCorrect = 0;
        for (const ra of retryAnswers) {
          const correctKey = ra.examBaseQuestion.correctAlternative;
          const selectedKey = ra.examBaseQuestion.alternatives.find(
            (a) => a.id === ra.selectedAlternativeId,
          )?.key;
          if (selectedKey === correctKey) retryCorrect += 1;
        }
        const finalCorrect = initialCorrect + retryCorrect;
        const finalPercentage =
          totalQuestions > 0 ? (finalCorrect / totalQuestions) * 100 : 0;
        updates.finalScorePercentage = new Decimal(finalPercentage);
      }
    }

    await this.prisma.trainingSession.update({
      where: { id: trainingId },
      data: updates,
    });

    if (requested === 'STUDY') {
      await this.ensureStudyItems(trainingId, session.examBaseAttemptId);
    }

    return this.getOne(trainingId, userId);
  }

  /** Create one TrainingStudyItem per SubjectFeedback for this attempt when entering STUDY. */
  private async ensureStudyItems(
    trainingId: string,
    attemptId: string,
  ): Promise<void> {
    const subjectFeedbacks = await this.prisma.subjectFeedback.findMany({
      where: { examBaseAttemptId: attemptId },
      select: { id: true, subject: true },
    });
    for (const sf of subjectFeedbacks) {
      await this.prisma.trainingStudyItem.upsert({
        where: {
          trainingSessionId_subjectFeedbackId: {
            trainingSessionId: trainingId,
            subjectFeedbackId: sf.id,
          },
        },
        create: {
          trainingSessionId: trainingId,
          subjectFeedbackId: sf.id,
          subject: sf.subject,
        },
        update: {},
      });
    }
  }

  /** List study items for the session (one per SubjectFeedback). Creates them from SubjectFeedback if not yet present. */
  async listStudyItems(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    await this.ensureStudyItems(trainingId, session.examBaseAttemptId);
    const items = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      include: {
        subjectFeedback: {
          select: { evaluation: true, recommendations: true },
        },
        exercises: {
          orderBy: { order: 'asc' },
          include: {
            alternatives: { orderBy: { key: 'asc' } },
          },
        },
      },
    });
    return items.map((item) => ({
      id: item.id,
      subject: item.subject,
      topic: item.topic,
      evaluation: item.subjectFeedback.evaluation,
      recommendations: item.subjectFeedback.recommendations,
      explanation: item.explanation,
      completedAt: item.completedAt?.toISOString() ?? null,
      exercises: item.exercises.map((ex) => ({
        id: ex.id,
        order: ex.order,
        statement: ex.statement,
        correctAlternativeKey: ex.correctAlternativeKey,
        alternatives: ex.alternatives.map((a) => ({
          id: a.id,
          key: a.key,
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      })),
    }));
  }

  /** Mark a study item (by id) as completed or not. */
  async completeStudyItem(
    trainingId: string,
    studyItemId: string,
    userId: string,
    completed: boolean,
  ) {
    await this.getSessionForUser(trainingId, userId);
    const item = await this.prisma.trainingStudyItem.findFirst({
      where: { id: studyItemId, trainingSessionId: trainingId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('study item not found');

    await this.prisma.trainingStudyItem.update({
      where: { id: studyItemId },
      data: { completedAt: completed ? new Date() : null },
    });

    const studyItems = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      select: { subject: true, completedAt: true },
    });
    const studyCompletedSubjects = studyItems
      .filter((i) => i.completedAt != null)
      .map((i) => i.subject);

    return { studyCompletedSubjects };
  }

  /** Mark a study item (by subject) as completed or not in the Study step. */
  async updateStudy(
    trainingId: string,
    userId: string,
    dto: UpdateStudyDto,
  ) {
    await this.getSessionForUser(trainingId, userId);
    const item = await this.prisma.trainingStudyItem.findFirst({
      where: { trainingSessionId: trainingId, subject: dto.subject },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('study item not found for this subject');

    await this.prisma.trainingStudyItem.update({
      where: { id: item.id },
      data: { completedAt: dto.completed ? new Date() : null },
    });

    const studyItems = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      select: { subject: true, completedAt: true },
    });
    const studyCompletedSubjects = studyItems
      .filter((i) => i.completedAt != null)
      .map((i) => i.subject);

    return { studyCompletedSubjects };
  }

  /** List questions that were wrong in the exam, for retry. Does not expose the previously selected alternative. */
  async listRetryQuestions(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    const attemptId = session.examBaseAttemptId;
    const examBaseId = session.examBaseId;

    const data = await this.examBaseAttemptService.getOneWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );
    const attempt = data.attempt;
    if (attempt.finishedAt == null) {
      throw new BadRequestException('exam must be finished before retry step');
    }

    const wrongQuestionIds = new Set<string>();
    for (const q of data.questions) {
      const selectedId = data.answers[q.id] ?? null;
      const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
      const correctId = correctAlt?.id ?? null;
      if (correctId != null && selectedId !== correctId) {
        wrongQuestionIds.add(q.id);
      }
    }

    const questions = data.questions.filter((q) => wrongQuestionIds.has(q.id));
    return questions.map((q) => {
      const { id, statement, statementImageUrl, referenceText, subject, topic, alternatives } = q;
      return {
        id,
        statement,
        statementImageUrl,
        referenceText,
        subject,
        topic,
        alternatives: alternatives.map((a) => ({ id: a.id, key: a.key, text: a.text })),
      };
    });
  }

  /** Submit or update a retry answer. Only allowed for questions that were wrong in the exam. */
  async upsertRetryAnswer(
    trainingId: string,
    userId: string,
    dto: UpsertRetryAnswerDto,
  ) {
    const session = await this.getSessionForUser(trainingId, userId);
    const attemptId = session.examBaseAttemptId;
    const examBaseId = session.examBaseId;

    const data = await this.examBaseAttemptService.getOneWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );
    const selectedId = data.answers[dto.questionId] ?? null;
    const q = data.questions.find((x) => x.id === dto.questionId);
    if (!q) throw new NotFoundException('question not found');
    const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
    const correctId = correctAlt?.id ?? null;
    if (correctId == null || selectedId === correctId) {
      throw new BadRequestException(
        'retry only allowed for questions that were wrong in the exam',
      );
    }

    const alt = q.alternatives.find((a) => a.id === dto.selectedAlternativeId);
    if (!alt) throw new BadRequestException('alternative not found for this question');

    await this.prisma.trainingRetryAnswer.upsert({
      where: {
        trainingSessionId_examBaseQuestionId: {
          trainingSessionId: trainingId,
          examBaseQuestionId: dto.questionId,
        },
      },
      create: {
        trainingSessionId: trainingId,
        examBaseQuestionId: dto.questionId,
        selectedAlternativeId: dto.selectedAlternativeId,
      },
      update: { selectedAlternativeId: dto.selectedAlternativeId },
    });

    return { questionId: dto.questionId, selectedAlternativeId: dto.selectedAlternativeId };
  }

  /**
   * Generate explanation + 5 exercises for a study item using IA.
   * Input: wrong questions for this subject (statement, alternatives, selectedKey only — not correctKey).
   * Rule: explanation must help on the topic without describing or revealing the specific question.
   */
  async generateStudyItemContent(
    trainingId: string,
    studyItemId: string,
    userId: string,
  ) {
    const session = await this.getSessionForUser(trainingId, userId);
    const item = await this.prisma.trainingStudyItem.findFirst({
      where: { id: studyItemId, trainingSessionId: trainingId },
      include: {
        subjectFeedback: {
          select: { subject: true, recommendations: true },
        },
      },
    });
    if (!item) throw new NotFoundException('study item not found');
    if (item.explanation != null) {
      return this.listStudyItems(trainingId, userId).then((items) =>
        items.find((i) => i.id === studyItemId),
      );
    }

    const attemptData = await this.examBaseAttemptService.getOneWithQuestionsAndAnswers(
      session.examBaseId,
      session.examBaseAttemptId,
      userId,
    );
    const subject = item.subjectFeedback.subject;
    const wrongQuestionsContext: Array<{
      statement: string;
      alternatives: Array<{ key: string; text: string }>;
      selectedKey: string | null;
    }> = [];
    for (const q of attemptData.questions) {
      if ((q.subject ?? 'Sem matéria') !== subject) continue;
      const selectedId = attemptData.answers[q.id] ?? null;
      const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
      const correctId = correctAlt?.id ?? null;
      if (correctId != null && selectedId === correctId) continue;
      const selectedKey =
        selectedId != null
          ? q.alternatives.find((a) => a.id === selectedId)?.key ?? null
          : null;
      wrongQuestionsContext.push({
        statement: q.statement,
        alternatives: q.alternatives.map((a) => ({ key: a.key, text: a.text })),
        selectedKey,
      });
    }

    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Cannot generate study content.',
      );
    }

    const systemPrompt = `Você é um tutor especializado em preparação para concursos. Sua tarefa é gerar conteúdo de estudo para o aluno.

Você receberá:
1. As recomendações de estudo (texto) para esta matéria.
2. Opcionalmente, as questões que o aluno ERROU nesta matéria (apenas como CONTEXTO do que ele precisa reforçar). Cada questão tem: statement (enunciado), alternatives (array com key e text), selectedKey (alternativa que o aluno marcou). NÃO receba qual é a alternativa correta.

REGRAS OBRIGATÓRIAS:
- A "explanation" deve explicar o assunto/tema de forma genérica, reforçando as recomendações, para ajudar o aluno a entender melhor. Use as questões erradas APENAS para saber em que tipo de conteúdo focar. A explanation NÃO pode descrever, citar ou dar a resposta da questão específica que foi enviada — senão o aluno terá a resposta na próxima interação (re-tentativa da prova).
- Gere exatamente 5 exercícios novos (não use as questões do contexto). Cada exercício: statement (enunciado em português), 4 alternativas com keys "A", "B", "C", "D", e correctAlternativeKey ("A", "B", "C" ou "D").
- Formato da explanation: use bullet points com "- ", pode usar **negrito**. Sem títulos com #.
- Retorne APENAS um JSON válido no formato: {"explanation":"...","exercises":[{"statement":"...","alternatives":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctAlternativeKey":"A"}, ...]} (5 objetos em exercises).`;

    const userPrompt = `Recomendações de estudo para esta matéria:
${item.subjectFeedback.recommendations}

Questões que o aluno errou (use apenas como contexto do que reforçar; NÃO cite nem resolva estas questões na explanation):
${JSON.stringify(wrongQuestionsContext, null, 2)}

Gere "explanation" (texto em português) e "exercises" (array com exatamente 5 exercícios, cada um com statement, alternatives [4 itens com key e text], correctAlternativeKey).`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestException(
        `xAI API error (${res.status}): ${errBody.slice(0, 300)}`,
      );
    }

    const dataRes = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = dataRes.choices?.[0]?.message?.content?.trim() ?? '';
    let jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: {
      explanation?: string;
      exercises?: Array<{
        statement?: string;
        alternatives?: Array<{ key?: string; text?: string }>;
        correctAlternativeKey?: string;
      }>;
    };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new BadRequestException('AI returned invalid JSON');
    }

    const explanation =
      typeof parsed.explanation === 'string' ? parsed.explanation : null;
    const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];

    await this.prisma.trainingStudyItem.update({
      where: { id: studyItemId },
      data: { explanation: explanation ?? undefined },
    });

    const keys = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < Math.min(5, exercises.length); i++) {
      const ex = exercises[i];
      const statement = typeof ex.statement === 'string' ? ex.statement : '';
      const correctKey =
        typeof ex.correctAlternativeKey === 'string' &&
        keys.includes(ex.correctAlternativeKey)
          ? ex.correctAlternativeKey
          : 'A';
      const alts = Array.isArray(ex.alternatives) ? ex.alternatives : [];
      const exercise = await this.prisma.studyExercise.create({
        data: {
          trainingStudyItemId: studyItemId,
          order: i + 1,
          statement,
          correctAlternativeKey: correctKey,
        },
      });
      for (const key of keys) {
        const alt = alts.find((a) => a.key === key);
        const text = alt && typeof alt.text === 'string' ? alt.text : '';
        await this.prisma.studyExerciseAlternative.create({
          data: {
            studyExerciseId: exercise.id,
            key,
            text,
            isCorrect: key === correctKey,
          },
        });
      }
    }

    const items = await this.listStudyItems(trainingId, userId);
    return items.find((i) => i.id === studyItemId) ?? null;
  }

  /** Get final payload (scores and feedback). Computes if not yet stored. */
  async getFinal(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    if (session.currentStage !== 'FINAL' && session.finalScorePercentage == null) {
      await this.updateStage(trainingId, userId, {
        stage: 'FINAL' as UpdateStageDto['stage'],
      });
    }
    const one = await this.getOne(trainingId, userId);
    if ('final' in one) return one.final;
    const session2 = await this.getSessionForUser(trainingId, userId);
    const attempt = session2.examBaseAttempt;
    const totalQuestions = await this.prisma.examBaseQuestion.count({
      where: { examBaseId: session2.examBaseId },
    });
    const initialPercentage = attempt.scorePercentage != null ? Number(attempt.scorePercentage) : 0;
    const initialCorrect = totalQuestions > 0 ? Math.round((initialPercentage / 100) * totalQuestions) : 0;
    const finalPercentage = session2.finalScorePercentage != null ? Number(session2.finalScorePercentage) : initialPercentage;
    const finalCorrect = totalQuestions > 0 ? Math.round((finalPercentage / 100) * totalQuestions) : 0;
    return {
      initialPercentage,
      beforeStudyPercentage: initialPercentage,
      finalPercentage,
      initialCorrect,
      finalCorrect,
      totalQuestions,
      gainPoints: finalCorrect - initialCorrect,
      gainPercent: Math.round(finalPercentage - initialPercentage),
      finalFeedback: session2.finalFeedback ?? undefined,
    };
  }
}
