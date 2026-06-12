/**
 * Temporal status of a concurso, derived on the backend (source of truth —
 * the front never recomputes it):
 *
 * - `open`   → today is inside the registration window (inclusive on both ends);
 * - `past`   → the exam day has already happened;
 * - `future` → everything else (including the exam day itself).
 *
 * Comparisons are day-granular in UTC so "the exact first/last day of
 * registration" and "the exam day" resolve deterministically regardless of
 * the time-of-day stored in the DB or the server clock.
 */
export type ConcursoStatus = 'open' | 'future' | 'past';

export interface ConcursoTimeline {
  registrationStart: Date | null;
  registrationEnd: Date | null;
  examDate: Date | null;
  resultDate: Date | null;
}

/** Truncates a date to its UTC day (milliseconds since epoch at 00:00 UTC). */
function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Collapses the per-prova dates of a concurso into a single concurso-level
 * timeline: registration opens with the earliest prova and closes with the
 * latest; the concurso only becomes "past" after its last exam day; the
 * result step shows the final (latest) result date.
 */
export function aggregateConcursoTimeline(
  provas: {
    registrationStart: Date | null;
    registrationEnd: Date | null;
    examDate: Date;
    resultDate: Date | null;
  }[],
): ConcursoTimeline {
  const earliest = (dates: (Date | null)[]): Date | null =>
    dates.reduce<Date | null>(
      (acc, d) => (d && (!acc || d < acc) ? d : acc),
      null,
    );
  const latest = (dates: (Date | null)[]): Date | null =>
    dates.reduce<Date | null>(
      (acc, d) => (d && (!acc || d > acc) ? d : acc),
      null,
    );
  return {
    registrationStart: earliest(provas.map((p) => p.registrationStart)),
    registrationEnd: latest(provas.map((p) => p.registrationEnd)),
    examDate: latest(provas.map((p) => p.examDate)),
    resultDate: latest(provas.map((p) => p.resultDate)),
  };
}

export function deriveConcursoStatus(
  timeline: Pick<
    ConcursoTimeline,
    'registrationStart' | 'registrationEnd' | 'examDate'
  >,
  now: Date = new Date(),
): ConcursoStatus {
  const today = utcDay(now);
  if (
    timeline.registrationStart &&
    timeline.registrationEnd &&
    today >= utcDay(timeline.registrationStart) &&
    today <= utcDay(timeline.registrationEnd)
  ) {
    return 'open';
  }
  // Without a registration window the decision falls to the exam date alone.
  if (timeline.examDate && utcDay(timeline.examDate) < today) return 'past';
  return 'future';
}
