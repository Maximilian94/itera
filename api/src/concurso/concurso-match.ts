import { GovernmentScope, PreferenceMobility, ExamHorizon } from '@prisma/client';
import { ConcursoStatus } from './concurso-status';
import { normalizeName } from '../geo/city-distance';

/**
 * Pure matching rules between a user's preference profile and a concurso card
 * from the discovery listing (GET /concursos). Derived on the backend (source
 * of truth — the front only translates reason codes into copy).
 *
 * v1 rules:
 * - location: `mobility` is the SEARCH SCOPE —
 *   - MAX_30MIN/1H/2H: travel-time budget from the anchor city (where the
 *     user lives or plans to move to; `travelMinutes` is estimated by the
 *     caller via geo/city-distance.ts). `travelMinutes === null` (city not
 *     geocodable) does NOT recommend under a budget — conservative:
 *     recommendations are always justified;
 *   - STATE: whole-state scope — any concurso within `pref.state`;
 *   - ANYWHERE: nationwide (willing to relocate) — no anchor at all.
 *   A concurso without UF or with FEDERAL scope counts as nationwide and
 *   matches every scope;
 * - salary: unknown on either side is neutral (never disqualifies);
 * - horizon × status: `past` never recommends; ASAP → only `open`;
 *   LONG_TERM → `open` or `future`.
 *
 * `careerStage` is deliberately NOT part of the matching in v1 — it is stored
 * for future copy/eligibility personalization (e.g. flagging COREN
 * requirements), not as a filter.
 */
export type MatchReason =
  | 'CITY'
  | 'NEARBY'
  | 'STATE'
  | 'NATIONWIDE'
  | 'SALARY'
  | 'REGISTRATION_OPEN'
  | 'UPCOMING';

export interface ConcursoMatch {
  recommended: boolean;
  /** Populated only when `recommended` — feeds the "why" chips on the card. */
  reasons: MatchReason[];
  /** Estimated travel minutes; present only alongside the NEARBY reason. */
  travelMinutes?: number;
}

export interface MatchPreference {
  /** Null only under ANYWHERE (nationwide has no anchor). */
  state: string | null;
  /** Anchor city; null under STATE/ANYWHERE. */
  city: string | null;
  mobility: PreferenceMobility;
  /** Prisma Decimal, string or null — compared via Number(). */
  minSalary: unknown | null;
  horizon: ExamHorizon;
}

export interface MatchCard {
  state: string | null;
  city: string | null;
  governmentScope: GovernmentScope;
  status: ConcursoStatus;
  salaryMax: string | null;
}

/** Travel budget per city-anchored bucket (STATE/ANYWHERE have no budget). */
const BUDGET_MINUTES: Partial<Record<PreferenceMobility, number>> = {
  [PreferenceMobility.MAX_30MIN]: 30,
  [PreferenceMobility.MAX_1H]: 60,
  [PreferenceMobility.MAX_2H]: 120,
};

const sameUf = (a: string, b: string) =>
  a.trim().toUpperCase() === b.trim().toUpperCase();

export function matchConcurso(
  pref: MatchPreference,
  card: MatchCard,
  /** Estimated minutes from the anchor city (geo/city-distance.ts); null = not geocodable / no anchor. */
  travelMinutes: number | null,
): ConcursoMatch {
  const reasons: MatchReason[] = [];
  let nearbyMinutes: number | undefined;

  // ---- Location (search scope) ----
  const nationwide =
    card.state == null || card.governmentScope === GovernmentScope.FEDERAL;

  let locationOk = false;
  if (nationwide) {
    locationOk = true;
    reasons.push('NATIONWIDE');
  } else if (pref.mobility === PreferenceMobility.ANYWHERE) {
    // Nationwide scope: everything passes; no anchor → no proximity chip.
    locationOk = true;
  } else if (pref.mobility === PreferenceMobility.STATE) {
    // Whole-state scope: any concurso within the chosen UF.
    locationOk = pref.state != null && sameUf(card.state as string, pref.state);
    if (locationOk) reasons.push('STATE');
  } else {
    // City anchor + travel budget.
    const budget = BUDGET_MINUTES[pref.mobility] as number;
    const sameCity =
      pref.state != null &&
      pref.city != null &&
      card.city != null &&
      sameUf(card.state as string, pref.state) &&
      normalizeName(card.city) === normalizeName(pref.city);
    if (sameCity) {
      locationOk = true;
      reasons.push('CITY');
    } else if (travelMinutes != null && travelMinutes <= budget) {
      // Null (not geocodable) does not recommend — the card degrades to
      // "Outros", never disappears.
      locationOk = true;
      reasons.push('NEARBY');
      nearbyMinutes = travelMinutes;
    }
  }

  // ---- Salary (unknown on either side is neutral) ----
  const minSalary =
    pref.minSalary == null ? null : Number(pref.minSalary as string | number);
  let salaryOk = true;
  if (minSalary != null && card.salaryMax != null) {
    salaryOk = Number(card.salaryMax) >= minSalary;
    if (salaryOk) reasons.push('SALARY');
  }

  // ---- Horizon × status ----
  let statusOk = false;
  if (card.status === 'open') {
    statusOk = true;
    reasons.push('REGISTRATION_OPEN');
  } else if (card.status === 'future' && pref.horizon === ExamHorizon.LONG_TERM) {
    statusOk = true;
    reasons.push('UPCOMING');
  }
  // `past` never recommends — the user can still train it from "Outros".

  const recommended = locationOk && salaryOk && statusOk;
  if (!recommended) return { recommended: false, reasons: [] };
  return nearbyMinutes != null
    ? { recommended: true, reasons, travelMinutes: nearbyMinutes }
    : { recommended: true, reasons };
}
