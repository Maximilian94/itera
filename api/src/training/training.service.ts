import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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

type StudyDifficultyLevel = 'AVANCADA';

interface WrongQuestionContext {
  statement: string;
  alternatives: { key: string; text: string }[];
  selectedKey: string | null;
  correctKey: string | null;
  topic: string | null;
  subtopics: string[];
  skills: string[];
  hasReferenceText: boolean;
}

interface GeneratedExerciseCandidate {
  statement?: string;
  alternatives?: { key?: string; text?: string }[];
  correctAlternativeKey?: string;
}

interface GeneratedStudyContent {
  explanation: string | null;
  exercises: GeneratedExerciseCandidate[];
}

const TARGET_STUDY_DIFFICULTY: StudyDifficultyLevel = 'AVANCADA';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

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

  private async requestStudyContentFromXAi(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<GeneratedStudyContent> {
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
      throw new BadRequestException(`xAI API error (${res.status}): ${errBody.slice(0, 300)}`);
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

    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(jsonStr);
    } catch {
      throw new BadRequestException('AI returned invalid JSON');
    }

    const parsed =
      typeof parsedUnknown === 'object' && parsedUnknown != null
        ? (parsedUnknown as {
            explanation?: unknown;
            exercises?: unknown;
          })
        : {};
    const exercises =
      Array.isArray(parsed.exercises) ? (parsed.exercises as GeneratedExerciseCandidate[]) : [];

    return {
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : null,
      exercises,
    };
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
      select: { subject: true, completedAt: true },
    });
    const subjectsWithItems = [...new Set(studyItems.map((i) => i.subject))];
    const studyCompletedSubjects = subjectsWithItems.filter((subject) =>
      studyItems
        .filter((i) => i.subject === subject)
        .every((i) => i.completedAt != null),
    );

    const latestRetry = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, finishedAt: true },
    });

    let retryCorrectMap: Record<string, string> | undefined;
    if (latestRetry?.finishedAt != null) {
      const retryAnswers = await this.prisma.trainingRetryAnswer.findMany({
        where: { trainingRetryId: latestRetry.id },
        select: { examBaseQuestionId: true },
      });
      const questionIds = retryAnswers.map((a) => a.examBaseQuestionId);
      if (questionIds.length > 0) {
        const questionsWithCorrect = await this.prisma.examBaseQuestion.findMany({
          where: { id: { in: questionIds } },
          select: {
            id: true,
            correctAlternative: true,
            alternatives: { select: { id: true, key: true } },
          },
        });
        retryCorrectMap = {};
        for (const q of questionsWithCorrect) {
          const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
          if (correctAlt) retryCorrectMap[q.id] = correctAlt.id;
        }
      }
    }

    const base = {
      trainingId: session.id,
      currentStage: session.currentStage,
      attemptId,
      examBaseId,
      examBoardId: session.examBase.examBoardId ?? null,
      examTitle: session.examBase.name,
      studyCompletedSubjects,
      attemptFinishedAt: attempt.finishedAt,
      retryFinishedAt: latestRetry?.finishedAt ?? null,
      ...(retryCorrectMap && { retryCorrectMap }),
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
        const latestRetry = await this.prisma.trainingRetry.findFirst({
          where: { trainingSessionId: trainingId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        const retryAnswers = latestRetry
          ? await this.prisma.trainingRetryAnswer.findMany({
              where: { trainingRetryId: latestRetry.id },
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
            })
          : [];
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

    if (requested === 'FINAL') {
      const latestRetry = await this.prisma.trainingRetry.findFirst({
        where: { trainingSessionId: trainingId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latestRetry) {
        await this.prisma.trainingRetry.update({
          where: { id: latestRetry.id },
          data: { finishedAt: new Date() },
        });
      }
    }

    if (requested === 'STUDY') {
      await this.ensureStudyItems(trainingId, session.examBaseAttemptId);
    }

    if (requested === 'RETRY') {
      await this.ensureRetry(trainingId);
    }

    return this.getOne(trainingId, userId);
  }

  /** Create one TrainingRetry for this session when entering RETRY stage. */
  private async ensureRetry(trainingId: string): Promise<void> {
    const existing = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.trainingRetry.create({
      data: { trainingSessionId: trainingId },
    });
  }

  /** Get the current (latest) TrainingRetry for this session, or create one. */
  private async getOrCreateRetry(trainingId: string): Promise<{ id: string }> {
    let retry = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!retry) {
      retry = await this.prisma.trainingRetry.create({
        data: { trainingSessionId: trainingId },
        select: { id: true },
      });
    }
    return retry;
  }

  /** Create one TrainingStudyItem per SubjectFeedbackRecommendation for this attempt when entering STUDY. */
  private async ensureStudyItems(
    trainingId: string,
    attemptId: string,
  ): Promise<void> {
    const recommendations = await this.prisma.subjectFeedbackRecommendation.findMany({
      where: { subjectFeedback: { examBaseAttemptId: attemptId } },
      select: { id: true, title: true, subjectFeedback: { select: { subject: true } } },
      orderBy: [{ subjectFeedbackId: 'asc' }, { order: 'asc' }],
    });
    for (const rec of recommendations) {
      await this.prisma.trainingStudyItem.upsert({
        where: {
          trainingSessionId_subjectFeedbackRecommendationId: {
            trainingSessionId: trainingId,
            subjectFeedbackRecommendationId: rec.id,
          },
        },
        create: {
          trainingSessionId: trainingId,
          subjectFeedbackRecommendationId: rec.id,
          subject: rec.subjectFeedback.subject,
          topic: rec.title,
        },
        update: {},
      });
    }
  }

  /** List study items for the session (one per recommendation). Creates them from recommendations if not yet present. */
  async listStudyItems(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    await this.ensureStudyItems(trainingId, session.examBaseAttemptId);
    const items = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      orderBy: [
        { subject: 'asc' },
        { subjectFeedbackRecommendation: { order: 'asc' } },
      ],
      include: {
        subjectFeedbackRecommendation: {
          select: { title: true, text: true },
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
      recommendationTitle: item.subjectFeedbackRecommendation.title,
      recommendationText: item.subjectFeedbackRecommendation.text,
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
    const subjectsWithItems = [...new Set(studyItems.map((i) => i.subject))];
    const studyCompletedSubjects = subjectsWithItems.filter((subject) =>
      studyItems
        .filter((i) => i.subject === subject)
        .every((i) => i.completedAt != null),
    );

    return { studyCompletedSubjects };
  }

  /** Mark all study items for a subject as completed or not. */
  async updateStudy(
    trainingId: string,
    userId: string,
    dto: UpdateStudyDto,
  ) {
    await this.getSessionForUser(trainingId, userId);
    const count = await this.prisma.trainingStudyItem.updateMany({
      where: { trainingSessionId: trainingId, subject: dto.subject },
      data: { completedAt: dto.completed ? new Date() : null },
    });
    if (count.count === 0) throw new NotFoundException('no study items found for this subject');

    const studyItems = await this.prisma.trainingStudyItem.findMany({
      where: { trainingSessionId: trainingId },
      select: { subject: true, completedAt: true },
    });
    const subjectsWithItems = [...new Set(studyItems.map((i) => i.subject))];
    const studyCompletedSubjects = subjectsWithItems.filter((subject) =>
      studyItems
        .filter((i) => i.subject === subject)
        .every((i) => i.completedAt != null),
    );

    return { studyCompletedSubjects };
  }

  /** Get current retry answers for this session (questionId -> selectedAlternativeId). */
  async getRetryAnswers(trainingId: string, userId: string): Promise<Record<string, string>> {
    await this.getSessionForUser(trainingId, userId);
    const latestRetry = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!latestRetry) return {};
    const answers = await this.prisma.trainingRetryAnswer.findMany({
      where: { trainingRetryId: latestRetry.id },
      select: { examBaseQuestionId: true, selectedAlternativeId: true },
    });
    const out: Record<string, string> = {};
    for (const a of answers) {
      out[a.examBaseQuestionId] = a.selectedAlternativeId;
    }
    return out;
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

  /**
   * Same as listRetryQuestions but returns full question data (correctAlternative, alternatives with explanation).
   * Only allowed when the latest retry has been finished (so we can show Explicação tab).
   */
  async listRetryQuestionsWithFeedback(trainingId: string, userId: string) {
    const session = await this.getSessionForUser(trainingId, userId);
    const latestRetry = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      orderBy: { createdAt: 'desc' },
      select: { finishedAt: true },
    });
    if (latestRetry?.finishedAt == null) {
      throw new BadRequestException(
        'retry questions with feedback only available after finalizing re-tentativa',
      );
    }

    const attemptId = session.examBaseAttemptId;
    const examBaseId = session.examBaseId;
    const data = await this.examBaseAttemptService.getOneWithQuestionsAndAnswers(
      examBaseId,
      attemptId,
      userId,
    );

    const wrongQuestionIds = new Set<string>();
    for (const q of data.questions) {
      const selectedId = data.answers[q.id] ?? null;
      const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
      const correctId = correctAlt?.id ?? null;
      if (correctId != null && selectedId !== correctId) {
        wrongQuestionIds.add(q.id);
      }
    }

    return data.questions
      .filter((q) => wrongQuestionIds.has(q.id))
      .map((q) => ({
        ...q,
        alternatives: q.alternatives.map((a) => ({
          id: a.id,
          key: a.key,
          text: a.text,
          explanation: a.explanation,
        })),
      }));
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

    const retry = await this.getOrCreateRetry(trainingId);
    const retryWithFinished = await this.prisma.trainingRetry.findUnique({
      where: { id: retry.id },
      select: { finishedAt: true },
    });
    if (retryWithFinished?.finishedAt != null) {
      throw new BadRequestException('re-tentativa já finalizada');
    }

    await this.prisma.trainingRetryAnswer.upsert({
      where: {
        trainingRetryId_examBaseQuestionId: {
          trainingRetryId: retry.id,
          examBaseQuestionId: dto.questionId,
        },
      },
      create: {
        trainingRetryId: retry.id,
        examBaseQuestionId: dto.questionId,
        selectedAlternativeId: dto.selectedAlternativeId,
      },
      update: { selectedAlternativeId: dto.selectedAlternativeId },
    });

    return { questionId: dto.questionId, selectedAlternativeId: dto.selectedAlternativeId };
  }

  /**
   * Generate explanation + 5 exercises for a study item (one recommendation) using IA.
   * Input: wrong questions for this subject with diagnostic context (selected/correct alternative and metadata).
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
        subjectFeedbackRecommendation: {
          select: { title: true, text: true },
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
    const subject = item.subject;
    const wrongQuestionsContext: WrongQuestionContext[] = [];
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
        correctKey: q.correctAlternative ?? null,
        topic: q.topic ?? null,
        subtopics: q.subtopics ?? [],
        skills: q.skills ?? [],
        hasReferenceText: (q.referenceText ?? '').trim().length > 0,
      });
    }
    const targetDifficulty = TARGET_STUDY_DIFFICULTY;
    const difficultyInstruction =
      'A explicação e os exercícios devem ser de nível AVANCADO: incluir casos limítrofes, armadilhas comuns e interpretação aprofundada. Evite exercícios triviais.';

    const apiKey = this.config.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'XAI_API_KEY is not configured. Cannot generate study content.',
      );
    }

    const systemPrompt = `Você é um tutor especializado em preparação para concursos. Sua tarefa é gerar conteúdo de estudo de excelente qualidade para o aluno.

Você receberá:
1. Uma recomendação de estudo (título e texto) que é o foco deste item.
2. Opcionalmente, as questões que o aluno ERROU nesta matéria (apenas como CONTEXTO do que ele precisa reforçar). Cada questão tem: statement (enunciado), alternatives (array com key e text), selectedKey (alternativa que o aluno marcou), correctKey (alternativa correta, APENAS para diagnóstico interno), topic, subtopics, skills e hasReferenceText.

REGRAS OBRIGATÓRIAS PARA A "explanation" (explicação):
- A explicação deve ser de **excelente qualidade**: clara, didática e aprofundada o suficiente para o aluno fixar o conteúdo. Reforce a recomendação recebida.
- **Inclua exemplos** sempre que fizer sentido. Quando possível, traga tanto **exemplos corretos** (aplicação adequada da regra ou conceito) quanto **exemplos errados** (o que NÃO se deve fazer ou como NÃO se aplica), explicando brevemente por que estão errados. O contraste entre certo e errado ajuda muito na fixação.
- Explique o assunto/tema de forma genérica. Use as questões erradas APENAS para saber em que tipo de conteúdo focar. A explicação NÃO pode descrever, citar ou dar a resposta da questão específica que foi enviada — senão o aluno terá a resposta na próxima interação (re-tentativa da prova).
- Nunca revele explicitamente qual alternativa era correta em nenhuma questão do contexto. O campo correctKey serve apenas para você diagnosticar lacunas e aumentar precisão pedagógica.
- Formato: use bullet points com "- " quando apropriado, **negrito** para termos importantes. Pode usar parágrafos curtos e subtópicos. Evite títulos com # no início.
- Tamanho: a explicação deve ser completa o suficiente para cobrir bem o tema (não seja superficial).
- Nível de dificuldade obrigatório: SEMPRE avançado.

REGRAS PARA OS EXERCÍCIOS:
- Gere exatamente 5 exercícios novos (não use as questões do contexto). Cada exercício: statement (enunciado em português), 4 alternativas com keys "A", "B", "C", "D", e correctAlternativeKey ("A", "B", "C" ou "D").
- Os exercícios devem ser avançados; evite exercícios fáceis ou excessivamente diretos.

FORMATO DE RESPOSTA:
- Retorne APENAS um JSON válido: {"explanation":"...","exercises":[{"statement":"...","alternatives":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctAlternativeKey":"A"}, ...]} (5 objetos em exercises).`;

    const rec = item.subjectFeedbackRecommendation;
    const recommendationsText = `**${rec.title}**: ${rec.text}`;
    const userPromptBase = `Recomendação de estudo (foco deste item):
${recommendationsText}

Nível mínimo exigido para explicação e exercícios: ${targetDifficulty}
Instrução de nível: ${difficultyInstruction}

Questões que o aluno errou (use apenas como contexto do que reforçar; NÃO cite nem resolva estas questões na explanation):
${JSON.stringify(wrongQuestionsContext, null, 2)}

Gere uma "explanation" (explicação em português, de qualidade; inclua exemplos corretos e exemplos errados quando fizer sentido) e "exercises" (array com exatamente 5 exercícios, cada um com statement, alternatives [4 itens com key e text], correctAlternativeKey).`;
    const generated = await this.requestStudyContentFromXAi(apiKey, systemPrompt, userPromptBase);
    this.logger.log(
      `Study content generated for studyItem=${studyItemId} with fixed target=${targetDifficulty}`,
    );

    const explanation = generated.explanation;
    const exercises = generated.exercises;

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

    const data = await this.examBaseAttemptService.getOneWithQuestionsAndAnswers(
      session2.examBaseId,
      session2.examBaseAttemptId,
      userId,
    );
    const subjectStatsInitial = this.examBaseAttemptService.getSubjectStats(data.questions, data.answers);

    const latestRetry = await this.prisma.trainingRetry.findFirst({
      where: { trainingSessionId: trainingId },
      orderBy: { createdAt: 'desc' },
    });
    const retryAnswersList = latestRetry
      ? await this.prisma.trainingRetryAnswer.findMany({
          where: { trainingRetryId: latestRetry.id },
          select: { examBaseQuestionId: true, selectedAlternativeId: true },
        })
      : [];
    const retryMap: Record<string, string | null> = {};
    for (const r of retryAnswersList) {
      retryMap[r.examBaseQuestionId] = r.selectedAlternativeId;
    }

    const combinedAnswers: Record<string, string | null> = {};
    for (const q of data.questions) {
      const correctAlt = q.alternatives.find((a) => a.key === q.correctAlternative);
      const correctId = correctAlt?.id ?? null;
      const initialSelected = data.answers[q.id] ?? null;
      const initialCorrectQ = correctId != null && initialSelected === correctId;
      combinedAnswers[q.id] = initialCorrectQ ? initialSelected : (retryMap[q.id] ?? null);
    }
    const subjectStatsFinal = this.examBaseAttemptService.getSubjectStats(data.questions, combinedAnswers);

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
      subjectStatsInitial,
      subjectStatsFinal,
    };
  }
}
