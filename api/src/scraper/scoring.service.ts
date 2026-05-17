import { Injectable } from '@nestjs/common';
import { GovernmentScope } from '@prisma/client';
import {
  EXAM_BOARD_TIER_1,
  EXAM_BOARD_TIER_2,
  EXAM_BOARD_TIER_3,
  HEALTH_KEYWORDS,
} from './scraper.constants';

@Injectable()
export class ScoringService {
  calculate(entry: {
    year: number;
    examBoardRaw: string;
    institution: string;
    governmentScope: GovernmentScope | null;
  }): number {
    const scope = entry.governmentScope ?? GovernmentScope.MUNICIPAL;
    return (
      this.scoreRecency(entry.year) +
      this.scoreExamBoard(entry.examBoardRaw) +
      this.scoreInstitution(entry.institution, scope) +
      this.scoreScope(scope)
    );
  }

  private scoreRecency(year: number): number {
    const age = new Date().getFullYear() - year;
    if (age <= 0) return 40;
    if (age === 1) return 35;
    if (age === 2) return 30;
    if (age === 3) return 25;
    if (age === 4) return 20;
    if (age === 5) return 15;
    if (age === 6) return 10;
    if (age <= 8) return 5;
    if (age <= 10) return 2;
    return 1;
  }

  private scoreExamBoard(raw: string): number {
    const name = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (EXAM_BOARD_TIER_1.some((b) => name.includes(b))) return 30;
    if (EXAM_BOARD_TIER_2.some((b) => name.includes(b))) return 20;
    if (EXAM_BOARD_TIER_3.some((b) => name.includes(b))) return 12;
    return 5;
  }

  private scoreInstitution(
    institution: string,
    scope: GovernmentScope,
  ): number {
    const isHealth = HEALTH_KEYWORDS.test(institution);
    if (scope === GovernmentScope.FEDERAL) return isHealth ? 20 : 15;
    if (scope === GovernmentScope.STATE) return isHealth ? 18 : 12;
    return 5;
  }

  private scoreScope(scope: GovernmentScope): number {
    if (scope === GovernmentScope.FEDERAL) return 10;
    if (scope === GovernmentScope.STATE) return 7;
    return 4;
  }
}
