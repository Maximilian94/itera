import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GovernmentScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function normalizeOptionalText(v: string | null | undefined) {
  const t = typeof v === 'string' ? v.trim() : v;
  return t === '' ? null : t ?? null;
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
  constructor(private readonly prisma: PrismaService) {}

  list(input?: { examBoardId?: string }) {
    return this.prisma.examBase.findMany({
      where: { examBoardId: input?.examBoardId },
      orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
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

  async getOne(examBaseId: string) {
    const examBase = await this.prisma.examBase.findUnique({
      where: { id: examBaseId },
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
    if (!examBase) throw new NotFoundException('exam base not found');
    return examBase;
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

    return this.prisma.examBase.update({
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
}

