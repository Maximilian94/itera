import 'reflect-metadata';
import type {
  DiagnosticoResultado,
  ProfileSlug,
} from '@domain/diagnostico/diagnostico.interface';
import {
  buildDiagnosticoResultadoVariables,
  DIAGNOSTICO_RESULTADO_TEMPLATE_ID,
  scoreToLabelAndColors,
} from './diagnostico-resultado.template';

function makeResultado(
  slug: ProfileSlug,
  scores: { clarezaDirecao: number; consistencia: number; qualidadeMetodo: number; retencao: number },
): DiagnosticoResultado {
  return {
    totalScore: 18,
    perfil: { slug, nome: slug, mensagemPrincipal: '...' },
    scores: [
      { categoria: 'clarezaDirecao', score: 0, maxScore: 9, percentage: scores.clarezaDirecao },
      { categoria: 'consistencia', score: 0, maxScore: 3, percentage: scores.consistencia },
      { categoria: 'qualidadeMetodo', score: 0, maxScore: 9, percentage: scores.qualidadeMetodo },
      { categoria: 'retencao', score: 0, maxScore: 6, percentage: scores.retencao },
    ],
    pontoForte: { categoria: 'retencao', score: 5, maxScore: 6, percentage: scores.retencao },
    pontoAtencao: { categoria: 'qualidadeMetodo', score: 3, maxScore: 9, percentage: scores.qualidadeMetodo },
    proximoPasso: 'Use seus erros como guia.',
  };
}

const baseParams = {
  firstName: 'Fulana',
  resultado: makeResultado('em_evolucao', {
    clarezaDirecao: 67,
    consistencia: 67,
    qualidadeMetodo: 33,
    retencao: 83,
  }),
};

describe('DIAGNOSTICO_RESULTADO_TEMPLATE_ID', () => {
  it('aponta para a template única no Resend', () => {
    expect(DIAGNOSTICO_RESULTADO_TEMPLATE_ID).toBe('seu-perfil-de-estudo');
  });
});

describe('scoreToLabelAndColors', () => {
  it('< 50 → "Precisa de atenção" / cor laranja', () => {
    const v = scoreToLabelAndColors(49);
    expect(v.label).toBe('Precisa de atenção');
    expect(v.labelColor).toBe('#C4582A');
    expect(v.barColor).toBe('#C4582A');
  });

  it('50-69 → "Bom" / cor azul', () => {
    const v = scoreToLabelAndColors(50);
    expect(v.label).toBe('Bom');
    expect(v.labelColor).toBe('#256B8F');
    expect(v.barColor).toBe('#256B8F');
  });

  it('69 ainda é "Bom" (limite inferior do verde é exclusivo)', () => {
    expect(scoreToLabelAndColors(69).label).toBe('Bom');
  });

  it('≥ 70 → "Forte" / cor verde', () => {
    const v = scoreToLabelAndColors(70);
    expect(v.label).toBe('Forte');
    expect(v.labelColor).toBe('#2D8F5B');
    expect(v.barColor).toBe('#2D8F5B');
  });

  it('100 também é "Forte"', () => {
    expect(scoreToLabelAndColors(100).label).toBe('Forte');
  });

  it('0 cai em "Precisa de atenção"', () => {
    expect(scoreToLabelAndColors(0).label).toBe('Precisa de atenção');
  });
});

describe('buildDiagnosticoResultadoVariables — identidade', () => {
  it('usa firstName trimado em LEAD_NAME', () => {
    const vars = buildDiagnosticoResultadoVariables({
      ...baseParams,
      firstName: '  Fulana  ',
    });
    expect(vars.LEAD_NAME).toBe('Fulana');
  });

  it('LEAD_NAME cai em "estudante" sem firstName', () => {
    const vars = buildDiagnosticoResultadoVariables({
      ...baseParams,
      firstName: undefined,
    });
    expect(vars.LEAD_NAME).toBe('estudante');
  });

  it('CTA_URL tem utm_source e utm_medium (template appenda utm_content)', () => {
    const vars = buildDiagnosticoResultadoVariables(baseParams);
    expect(vars.CTA_URL).toContain('utm_source=diagnostico');
    expect(vars.CTA_URL).toContain('utm_medium=email');
    // utm_content NÃO está aqui — é appended pelo HTML do template.
    expect(vars.CTA_URL).not.toContain('utm_content');
  });
});

describe('buildDiagnosticoResultadoVariables — scores', () => {
  it('mapeia categorias pra DIRECTION/CONSISTENCY/METHOD/RETENTION com _SCORE', () => {
    const vars = buildDiagnosticoResultadoVariables(baseParams);
    expect(vars.DIRECTION_SCORE).toBe('67');
    expect(vars.CONSISTENCY_SCORE).toBe('67');
    expect(vars.METHOD_SCORE).toBe('33');
    expect(vars.RETENTION_SCORE).toBe('83');
  });

  it('arredonda percentages fracionados', () => {
    const vars = buildDiagnosticoResultadoVariables({
      ...baseParams,
      resultado: makeResultado('em_evolucao', {
        clarezaDirecao: 22.22,
        consistencia: 33.33,
        qualidadeMetodo: 55.55,
        retencao: 83.33,
      }),
    });
    expect(vars.DIRECTION_SCORE).toBe('22');
    expect(vars.CONSISTENCY_SCORE).toBe('33');
    expect(vars.METHOD_SCORE).toBe('56');
    expect(vars.RETENTION_SCORE).toBe('83');
  });

  it('cada eixo ganha LABEL + LABEL_COLOR + BAR_COLOR consistentes com scoreToLabelAndColors', () => {
    const vars = buildDiagnosticoResultadoVariables(baseParams);
    // 67 → "Bom"
    expect(vars.DIRECTION_LABEL).toBe('Bom');
    expect(vars.DIRECTION_LABEL_COLOR).toBe('#256B8F');
    expect(vars.DIRECTION_BAR_COLOR).toBe('#256B8F');
    // 33 → "Precisa de atenção"
    expect(vars.METHOD_LABEL).toBe('Precisa de atenção');
    expect(vars.METHOD_LABEL_COLOR).toBe('#C4582A');
    // 83 → "Forte"
    expect(vars.RETENTION_LABEL).toBe('Forte');
    expect(vars.RETENTION_LABEL_COLOR).toBe('#2D8F5B');
  });
});

describe('buildDiagnosticoResultadoVariables — conteúdo por perfil', () => {
  const perfis: ProfileSlug[] = [
    'sobrecarregado',
    'esforcado_sem_direcao',
    'em_evolucao',
    'estrategico',
  ];

  it.each(perfis)(
    'perfil "%s" gera todas as variáveis sem string vazia',
    (slug) => {
      const vars = buildDiagnosticoResultadoVariables({
        ...baseParams,
        resultado: makeResultado(slug, {
          clarezaDirecao: 50,
          consistencia: 50,
          qualidadeMetodo: 50,
          retencao: 50,
        }),
      });

      const expectedKeys = [
        'LEAD_NAME',
        'PROFILE_NAME',
        'PROFILE_TAGLINE',
        'PROFILE_DESCRIPTION',
        'HERO_SUBTITLE',
        'DIRECTION_SCORE',
        'DIRECTION_LABEL',
        'DIRECTION_LABEL_COLOR',
        'DIRECTION_BAR_COLOR',
        'CONSISTENCY_SCORE',
        'CONSISTENCY_LABEL',
        'CONSISTENCY_LABEL_COLOR',
        'CONSISTENCY_BAR_COLOR',
        'METHOD_SCORE',
        'METHOD_LABEL',
        'METHOD_LABEL_COLOR',
        'METHOD_BAR_COLOR',
        'RETENTION_SCORE',
        'RETENTION_LABEL',
        'RETENTION_LABEL_COLOR',
        'RETENTION_BAR_COLOR',
        'STRENGTH_1',
        'STRENGTH_2',
        'STRENGTH_3',
        'IMPROVEMENT_1',
        'IMPROVEMENT_2',
        'IMPROVEMENT_3',
        'REVEAL_LEAD_1',
        'REVEAL_BODY_1',
        'REVEAL_LEAD_2',
        'REVEAL_BODY_2',
        'FOCUS_INTRO',
        'FOCUS_STEP_1',
        'FOCUS_STEP_2',
        'FOCUS_STEP_3',
        'ROADMAP_STEP_1',
        'ROADMAP_STEP_2',
        'ROADMAP_STEP_3',
        'ROADMAP_STEP_4',
        'CTA_URL',
      ];

      for (const key of expectedKeys) {
        expect(vars[key]).toBeDefined();
        expect(vars[key]).not.toBe('');
      }
    },
  );

  it('PROFILE_NAME muda por perfil', () => {
    const sobre = buildDiagnosticoResultadoVariables({
      ...baseParams,
      resultado: makeResultado('sobrecarregado', { clarezaDirecao: 10, consistencia: 10, qualidadeMetodo: 10, retencao: 10 }),
    });
    const estr = buildDiagnosticoResultadoVariables({
      ...baseParams,
      resultado: makeResultado('estrategico', { clarezaDirecao: 90, consistencia: 90, qualidadeMetodo: 90, retencao: 90 }),
    });

    expect(sobre.PROFILE_NAME).toBe('Estudante Sobrecarregado');
    expect(estr.PROFILE_NAME).toBe('Estudante Estratégico');
    expect(sobre.PROFILE_DESCRIPTION).not.toBe(estr.PROFILE_DESCRIPTION);
  });

  it('throw com perfil não mapeado', () => {
    expect(() =>
      buildDiagnosticoResultadoVariables({
        ...baseParams,
        resultado: makeResultado('inexistente' as ProfileSlug, {
          clarezaDirecao: 0,
          consistencia: 0,
          qualidadeMetodo: 0,
          retencao: 0,
        }),
      }),
    ).toThrow(/PROFILE_CONTENT_MAP missing entry/);
  });
});
