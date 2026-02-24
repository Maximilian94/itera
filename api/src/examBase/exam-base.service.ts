import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GovernmentScope, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function normalizeOptionalText(v: string | null | undefined) {
  const t = typeof v === 'string' ? v.trim() : v;
  return t === '' ? null : (t ?? null);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function assertValidGovernmentScopeLocation(input: {
  governmentScope: GovernmentScope;
  state: string | null | undefined;
  city: string | null | undefined;
}) {
  const state = normalizeOptionalText(input.state);
  const city = normalizeOptionalText(input.city);

  if (input.governmentScope === GovernmentScope.MUNICIPAL) {
    if (!state || !city) {
      throw new BadRequestException(
        'For MUNICIPAL scope, both state and city are required.',
      );
    }
    return;
  }

  if (input.governmentScope === GovernmentScope.STATE) {
    if (!state) {
      throw new BadRequestException('For STATE scope, state is required.');
    }
    if (city) {
      throw new BadRequestException(
        'For STATE scope, city must be null/undefined.',
      );
    }
    return;
  }

  // FEDERAL
  if (state || city) {
    throw new BadRequestException(
      'For FEDERAL scope, state and city must be null/undefined.',
    );
  }
}

@Injectable()
export class ExamBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async triggerRevalidate(slug?: string | null): Promise<void> {
    const baseUrl = this.config.get<string>('NEXTJS_URL');
    const secret = this.config.get<string>('REVALIDATE_SECRET');
    if (!baseUrl?.trim() || !secret?.trim()) return;
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, slug: slug ?? undefined }),
      });
      if (!res.ok) {
        console.warn('[ExamBaseService] Revalidate failed:', res.status);
      }
    } catch (err) {
      console.warn('[ExamBaseService] Revalidate error:', err);
    }
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  }

  async list(
    input?: { examBoardId?: string },
    userId?: string,
  ) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;
    const examBases = await this.prisma.examBase.findMany({
      where: {
        examBoardId: input?.examBoardId,
        ...(showUnpublished ? {} : { published: true }),
      },
      orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        institution: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        salaryBase: true,
        examDate: true,
        minPassingGradeNonQuota: true,
        published: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
        _count: { select: { questions: true } },
      },
    });

    if (!userId) {
      return examBases as Array<
        (typeof examBases)[number] & {
          userStats?: { attemptCount: number; bestScore: number | null };
        }
      >;
    }

    const stats = await this.prisma.examBaseAttempt.groupBy({
      by: ['examBaseId'],
      where: {
        userId,
        finishedAt: { not: null },
      },
      _count: { id: true },
      _max: { scorePercentage: true } as Parameters<
        typeof this.prisma.examBaseAttempt.groupBy
      >[0]['_max'],
    });

    const statsByExamBaseId = new Map<
      string,
      { attemptCount: number; bestScore: number | null }
    >();
    for (const s of stats) {
      const count = (s._count as { id: number } | undefined)?.id ?? 0;
      const maxScore = (s._max as { scorePercentage: unknown } | undefined)
        ?.scorePercentage;
      statsByExamBaseId.set(s.examBaseId, {
        attemptCount: count,
        bestScore:
          maxScore != null ? Number(maxScore) : null,
      });
    }

    const examBaseIdsNeedingScore = [...statsByExamBaseId.entries()]
      .filter(([, v]) => v.attemptCount > 0 && v.bestScore === null)
      .map(([id]) => id);

    if (examBaseIdsNeedingScore.length > 0) {
      const attemptsWithoutScore = await this.prisma.examBaseAttempt.findMany({
        where: {
          userId,
          finishedAt: { not: null },
          scorePercentage: null,
          examBaseId: { in: examBaseIdsNeedingScore },
        },
        select: {
          id: true,
          examBaseId: true,
          answers: {
            select: {
              examBaseQuestionId: true,
              selectedAlternativeId: true,
            },
          },
        },
      });

      if (attemptsWithoutScore.length > 0) {
        const questionsByBase =
          await this.prisma.examBaseQuestion.findMany({
            where: { examBaseId: { in: examBaseIdsNeedingScore } },
            select: {
              id: true,
              examBaseId: true,
              correctAlternative: true,
              alternatives: { select: { id: true, key: true } },
            },
          });

        const correctAltByQuestion = new Map<string, string>();
        for (const q of questionsByBase) {
          const alt = q.alternatives.find(
            (a) => a.key === q.correctAlternative,
          );
          if (alt) correctAltByQuestion.set(q.id, alt.id);
        }

        const questionCountByExamBaseId = new Map<string, number>();
        for (const q of questionsByBase) {
          questionCountByExamBaseId.set(
            q.examBaseId,
            (questionCountByExamBaseId.get(q.examBaseId) ?? 0) + 1,
          );
        }

        const bestScoreByExamBaseId = new Map<string, number>();
        for (const a of attemptsWithoutScore) {
          const total =
            questionCountByExamBaseId.get(a.examBaseId) ?? 0;
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
          const percentage = total > 0 ? (correct / total) * 100 : 0;
          const current = bestScoreByExamBaseId.get(a.examBaseId);
          if (current == null || percentage > current) {
            bestScoreByExamBaseId.set(a.examBaseId, percentage);
          }
        }

        for (const examBaseId of examBaseIdsNeedingScore) {
          const best = bestScoreByExamBaseId.get(examBaseId);
          if (best != null) {
            const existing = statsByExamBaseId.get(examBaseId)!;
            statsByExamBaseId.set(examBaseId, {
              ...existing,
              bestScore: best,
            });
          }
        }
      }
    }

    return examBases.map((exam) => {
      const userStats = statsByExamBaseId.get(exam.id) ?? {
        attemptCount: 0,
        bestScore: null as number | null,
      };
      return { ...exam, userStats };
    });
  }

  async getOne(examBaseId: string, userId?: string) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;
    const examBase = await this.prisma.examBase.findFirst({
      where: {
        id: examBaseId,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        institution: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        salaryBase: true,
        examDate: true,
        minPassingGradeNonQuota: true,
        published: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');
    return examBase;
  }

  async getBySlug(slug: string, userId?: string) {
    const showUnpublished = userId ? await this.isAdmin(userId) : false;
    const examBase = await this.prisma.examBase.findFirst({
      where: {
        slug,
        ...(showUnpublished ? {} : { published: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        institution: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        salaryBase: true,
        examDate: true,
        minPassingGradeNonQuota: true,
        published: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');
    return examBase;
  }

  async generateSlug(examBaseId: string): Promise<{ slug: string }> {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: {
        id: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        examDate: true,
        examBoard: { select: { name: true } },
      },
    });
    if (!examBase) throw new NotFoundException('exam base not found');

    const year = new Date(examBase.examDate).getFullYear().toString();
    const parts: string[] = [];
    if (examBase.examBoard?.name) parts.push(slugify(examBase.examBoard.name));
    if (examBase.state) parts.push(slugify(examBase.state));
    if (examBase.city) parts.push(slugify(examBase.city));
    parts.push(year);
    parts.push(slugify(examBase.role));

    const slug = parts.filter(Boolean).join('-');
    if (!slug) throw new BadRequestException('Não foi possível gerar slug (banca, estado/cidade e cargo são necessários).');

    await this.prisma.examBase.update({
      where: { id: examBaseId },
      data: { slug },
    });
    await this.triggerRevalidate(slug);
    return { slug };
  }

  async setPublished(examBaseId: string, published: boolean) {
    const exists = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true, slug: true },
    });
    if (!exists) throw new NotFoundException('exam base not found');
    const result = await this.prisma.examBase.update({
      where: { id: examBaseId },
      data: { published },
      select: {
        id: true,
        name: true,
        published: true,
      },
    });
    await this.triggerRevalidate(exists.slug);
    return result;
  }

  create(input: {
    name: string;
    examBoardId?: string;
    institution?: string;
    role: string;
    governmentScope: GovernmentScope;
    state?: string | null;
    city?: string | null;
    salaryBase?: string | number | null;
    examDate: string;
    minPassingGradeNonQuota?: string | number | null;
  }) {
    assertValidGovernmentScopeLocation({
      governmentScope: input.governmentScope,
      state: input.state,
      city: input.city,
    });

    return this.prisma.examBase.create({
      data: {
        name: input.name,
        examBoardId: input.examBoardId,
        institution: input.institution,
        role: input.role,
        governmentScope: input.governmentScope,
        state: normalizeOptionalText(input.state),
        city: normalizeOptionalText(input.city),
        salaryBase: input.salaryBase ?? undefined,
        examDate: new Date(input.examDate),
        minPassingGradeNonQuota: input.minPassingGradeNonQuota ?? undefined,
      },
      select: {
        id: true,
        name: true,
        institution: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        salaryBase: true,
        examDate: true,
        minPassingGradeNonQuota: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
  }

  async update(
    examBaseId: string,
    input: {
      name?: string;
      examBoardId?: string | null;
      institution?: string | null;
      role?: string;
      governmentScope?: GovernmentScope;
      state?: string | null;
      city?: string | null;
      salaryBase?: string | number | null;
      examDate?: string;
      minPassingGradeNonQuota?: string | number | null;
      slug?: string | null;
    },
  ) {
    const exists = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
      select: { id: true, governmentScope: true, state: true, city: true },
    });
    if (!exists) throw new NotFoundException('exam base not found');

    const mergedGovernmentScope = input.governmentScope ?? exists.governmentScope;
    const mergedState =
      input.state === undefined ? exists.state : normalizeOptionalText(input.state);
    const mergedCity =
      input.city === undefined ? exists.city : normalizeOptionalText(input.city);

    assertValidGovernmentScopeLocation({
      governmentScope: mergedGovernmentScope,
      state: mergedState,
      city: mergedCity,
    });

    const result = await this.prisma.examBase.update({
      where: { id: examBaseId },
      data: {
        name: input.name,
        examBoardId: input.examBoardId,
        institution: input.institution,
        role: input.role,
        governmentScope: input.governmentScope,
        state: input.state === undefined ? undefined : mergedState,
        city: input.city === undefined ? undefined : mergedCity,
        salaryBase: input.salaryBase === undefined ? undefined : input.salaryBase,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
        minPassingGradeNonQuota:
          input.minPassingGradeNonQuota === undefined
            ? undefined
            : input.minPassingGradeNonQuota,
        slug: input.slug === undefined ? undefined : input.slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        institution: true,
        role: true,
        governmentScope: true,
        state: true,
        city: true,
        salaryBase: true,
        examDate: true,
        minPassingGradeNonQuota: true,
        examBoardId: true,
        examBoard: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    await this.triggerRevalidate(result.slug);
    return result;
  }
}

