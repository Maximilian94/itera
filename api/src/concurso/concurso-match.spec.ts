import {
  GovernmentScope,
  PreferenceMobility,
  ExamHorizon,
} from '@prisma/client';
import { matchConcurso, MatchCard, MatchPreference } from './concurso-match';

function pref(overrides: Partial<MatchPreference> = {}): MatchPreference {
  return {
    state: 'SP',
    city: 'Campinas',
    mobility: PreferenceMobility.MAX_1H,
    minSalary: null,
    horizon: ExamHorizon.ASAP,
    ...overrides,
  };
}

function card(overrides: Partial<MatchCard> = {}): MatchCard {
  return {
    state: 'SP',
    city: 'Campinas',
    governmentScope: GovernmentScope.MUNICIPAL,
    status: 'open',
    salaryMax: null,
    ...overrides,
  };
}

describe('matchConcurso', () => {
  describe('location × travel budget', () => {
    it('same city recommends with CITY reason (no travel estimate needed)', () => {
      const m = matchConcurso(pref(), card(), null);
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('CITY');
      expect(m.travelMinutes).toBeUndefined();
    });

    it('normalizes accents/casing on the free-text city for the same-city check', () => {
      const m = matchConcurso(
        pref({ city: 'São Paulo' }),
        card({ city: '  sao paulo ' }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('CITY');
    });

    it.each([
      [PreferenceMobility.MAX_30MIN, 30],
      [PreferenceMobility.MAX_1H, 60],
      [PreferenceMobility.MAX_2H, 120],
    ])('%s: travel within budget recommends with NEARBY + travelMinutes', (mobility, budget) => {
      const m = matchConcurso(
        pref({ mobility }),
        card({ city: 'Valinhos' }),
        budget,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('NEARBY');
      expect(m.travelMinutes).toBe(budget);
    });

    it('travel above the budget does not recommend', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.MAX_30MIN }),
        card({ city: 'Santos' }),
        45,
      );
      expect(m.recommended).toBe(false);
      expect(m.reasons).toEqual([]);
    });

    it('non-geocodable city (travel null) does not recommend under a budget — conservative', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.MAX_2H }),
        card({ city: 'Cidade Fantasia' }),
        null,
      );
      expect(m.recommended).toBe(false);
    });

    it('STATE scope: same UF recommends with STATE reason (any city)', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.STATE, city: null }),
        card({ city: 'Santos' }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('STATE');
      expect(m.travelMinutes).toBeUndefined();
    });

    it('STATE scope: other UF does not recommend', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.STATE, city: null }),
        card({ state: 'RJ', city: 'Niterói' }),
        null,
      );
      expect(m.recommended).toBe(false);
      expect(m.reasons).toEqual([]);
    });

    it('ANYWHERE (no anchor): any concurso recommends, without proximity chip', () => {
      const far = matchConcurso(
        pref({ mobility: PreferenceMobility.ANYWHERE, state: null, city: null }),
        card({ state: 'AM', city: 'Manaus' }),
        null,
      );
      expect(far.recommended).toBe(true);
      expect(far.reasons).toEqual(['REGISTRATION_OPEN']);
      expect(far.travelMinutes).toBeUndefined();
    });

    it('state null counts as nationwide for every mobility', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.MAX_30MIN }),
        card({ state: null, city: null }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('NATIONWIDE');
    });

    it('FEDERAL scope counts as nationwide even with a state set', () => {
      const m = matchConcurso(
        pref({ mobility: PreferenceMobility.MAX_30MIN }),
        card({ state: 'RJ', city: 'Rio de Janeiro', governmentScope: GovernmentScope.FEDERAL }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('NATIONWIDE');
    });
  });

  describe('salary', () => {
    it('minSalary null is neutral (no SALARY reason)', () => {
      const m = matchConcurso(pref(), card({ salaryMax: '1000.00' }), null);
      expect(m.recommended).toBe(true);
      expect(m.reasons).not.toContain('SALARY');
    });

    it('salaryMax null is neutral — never disqualifies', () => {
      const m = matchConcurso(
        pref({ minSalary: '5000.00' }),
        card({ salaryMax: null }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).not.toContain('SALARY');
    });

    it('salaryMax >= minSalary recommends with SALARY reason', () => {
      const m = matchConcurso(
        pref({ minSalary: '3000.00' }),
        card({ salaryMax: '3000.00' }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('SALARY');
    });

    it('salaryMax < minSalary disqualifies and clears reasons', () => {
      const m = matchConcurso(
        pref({ minSalary: '5000.00' }),
        card({ salaryMax: '4999.99' }),
        null,
      );
      expect(m.recommended).toBe(false);
      expect(m.reasons).toEqual([]);
    });
  });

  describe('horizon × status', () => {
    it('ASAP recommends open with REGISTRATION_OPEN', () => {
      const m = matchConcurso(pref(), card({ status: 'open' }), null);
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('REGISTRATION_OPEN');
    });

    it('ASAP does not recommend future', () => {
      const m = matchConcurso(pref(), card({ status: 'future' }), null);
      expect(m.recommended).toBe(false);
    });

    it('LONG_TERM recommends future with UPCOMING', () => {
      const m = matchConcurso(
        pref({ horizon: ExamHorizon.LONG_TERM }),
        card({ status: 'future' }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('UPCOMING');
    });

    it('LONG_TERM also recommends open', () => {
      const m = matchConcurso(
        pref({ horizon: ExamHorizon.LONG_TERM }),
        card({ status: 'open' }),
        null,
      );
      expect(m.recommended).toBe(true);
      expect(m.reasons).toContain('REGISTRATION_OPEN');
    });

    it('past never recommends, for any horizon', () => {
      for (const horizon of [ExamHorizon.ASAP, ExamHorizon.LONG_TERM]) {
        const m = matchConcurso(pref({ horizon }), card({ status: 'past' }), 0);
        expect(m.recommended).toBe(false);
        expect(m.reasons).toEqual([]);
      }
    });
  });

  it('full match emits the exact reason set', () => {
    const m = matchConcurso(
      pref({ minSalary: '3000.00' }),
      card({ city: 'Valinhos', salaryMax: '5800.00' }),
      25,
    );
    expect(m.recommended).toBe(true);
    expect(m.reasons).toEqual(['NEARBY', 'SALARY', 'REGISTRATION_OPEN']);
    expect(m.travelMinutes).toBe(25);
  });
});
