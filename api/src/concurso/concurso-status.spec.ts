import {
  aggregateConcursoTimeline,
  deriveConcursoStatus,
} from './concurso-status';

const d = (iso: string) => new Date(iso);

describe('deriveConcursoStatus', () => {
  const window = {
    registrationStart: d('2026-05-01T00:00:00.000Z'),
    registrationEnd: d('2026-05-31T00:00:00.000Z'),
    examDate: d('2026-07-12T00:00:00.000Z'),
  };

  it('open no dia exato do início das inscrições', () => {
    expect(deriveConcursoStatus(window, d('2026-05-01T08:00:00.000Z'))).toBe(
      'open',
    );
  });

  it('open no dia exato do fim das inscrições (inclusive)', () => {
    expect(deriveConcursoStatus(window, d('2026-05-31T23:59:00.000Z'))).toBe(
      'open',
    );
  });

  it('future antes da janela abrir', () => {
    expect(deriveConcursoStatus(window, d('2026-04-30T12:00:00.000Z'))).toBe(
      'future',
    );
  });

  it('future entre o fim das inscrições e a prova', () => {
    expect(deriveConcursoStatus(window, d('2026-06-15T12:00:00.000Z'))).toBe(
      'future',
    );
  });

  it('future no dia exato da prova (examDate < hoje é falso)', () => {
    expect(deriveConcursoStatus(window, d('2026-07-12T18:00:00.000Z'))).toBe(
      'future',
    );
  });

  it('past no dia seguinte à prova', () => {
    expect(deriveConcursoStatus(window, d('2026-07-13T00:00:00.000Z'))).toBe(
      'past',
    );
  });

  describe('sem janela de inscrição cadastrada', () => {
    const noWindow = {
      registrationStart: null,
      registrationEnd: null,
      examDate: d('2026-07-12T00:00:00.000Z'),
    };

    it('decide future/past só pela examDate', () => {
      expect(
        deriveConcursoStatus(noWindow, d('2026-07-11T00:00:00.000Z')),
      ).toBe('future');
      expect(
        deriveConcursoStatus(noWindow, d('2026-07-13T00:00:00.000Z')),
      ).toBe('past');
    });

    it('janela incompleta (só início) não abre o concurso', () => {
      expect(
        deriveConcursoStatus(
          { ...noWindow, registrationStart: d('2026-05-01T00:00:00.000Z') },
          d('2026-05-02T00:00:00.000Z'),
        ),
      ).toBe('future');
    });
  });
});

describe('aggregateConcursoTimeline', () => {
  it('inscrições abrem com a primeira prova e fecham com a última; prova/resultado usam a data mais tardia', () => {
    const timeline = aggregateConcursoTimeline([
      {
        registrationStart: d('2026-05-03T00:00:00.000Z'),
        registrationEnd: d('2026-05-28T00:00:00.000Z'),
        examDate: d('2026-07-12T00:00:00.000Z'),
        resultDate: d('2026-09-30T00:00:00.000Z'),
      },
      {
        registrationStart: d('2026-05-01T00:00:00.000Z'),
        registrationEnd: d('2026-05-31T00:00:00.000Z'),
        examDate: d('2026-07-19T00:00:00.000Z'),
        resultDate: null,
      },
    ]);

    expect(timeline).toEqual({
      registrationStart: d('2026-05-01T00:00:00.000Z'),
      registrationEnd: d('2026-05-31T00:00:00.000Z'),
      examDate: d('2026-07-19T00:00:00.000Z'),
      resultDate: d('2026-09-30T00:00:00.000Z'),
    });
  });

  it('campos sem nenhum valor ficam null', () => {
    const timeline = aggregateConcursoTimeline([
      {
        registrationStart: null,
        registrationEnd: null,
        examDate: d('2026-07-12T00:00:00.000Z'),
        resultDate: null,
      },
    ]);

    expect(timeline.registrationStart).toBeNull();
    expect(timeline.registrationEnd).toBeNull();
    expect(timeline.resultDate).toBeNull();
    expect(timeline.examDate).toEqual(d('2026-07-12T00:00:00.000Z'));
  });
});
