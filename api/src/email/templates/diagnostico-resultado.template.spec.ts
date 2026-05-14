import 'reflect-metadata';
import type { DiagnosticoResultado } from '@domain/diagnostico/diagnostico.interface';
import {
  buildDiagnosticoResultadoVariables,
  PERFIL_TO_RESEND_TEMPLATE_ID,
} from './diagnostico-resultado.template';

const resultadoEmEvolucao: DiagnosticoResultado = {
  totalScore: 18,
  perfil: {
    slug: 'em_evolucao',
    nome: 'Estudante em Evolução',
    mensagemPrincipal: 'Você já tem uma boa base...',
  },
  scores: [
    { categoria: 'clarezaDirecao', score: 6, maxScore: 9, percentage: 67 },
    { categoria: 'consistencia', score: 2, maxScore: 3, percentage: 67 },
    { categoria: 'qualidadeMetodo', score: 3, maxScore: 9, percentage: 33 },
    { categoria: 'retencao', score: 5, maxScore: 6, percentage: 83 },
  ],
  pontoForte: {
    categoria: 'retencao',
    score: 5,
    maxScore: 6,
    percentage: 83,
  },
  pontoAtencao: {
    categoria: 'qualidadeMetodo',
    score: 3,
    maxScore: 9,
    percentage: 33,
  },
  proximoPasso: 'Use seus erros como guia.',
};

describe('buildDiagnosticoResultadoVariables', () => {
  it('mapeia categorias para variáveis *_SCORE como número (sem %)', () => {
    const vars = buildDiagnosticoResultadoVariables({
      firstName: 'Fulana',
      resultado: resultadoEmEvolucao,
    });

    expect(vars.DIRECTION_SCORE).toBe('67');
    expect(vars.CONSISTENCY_SCORE).toBe('67');
    expect(vars.METHOD_SCORE).toBe('33');
    expect(vars.RETENTION_SCORE).toBe('83');
  });

  it('usa firstName trimado em LEAD_NAME', () => {
    const vars = buildDiagnosticoResultadoVariables({
      firstName: '  Fulana  ',
      resultado: resultadoEmEvolucao,
    });
    expect(vars.LEAD_NAME).toBe('Fulana');
  });

  it('LEAD_NAME cai em "estudante" sem firstName', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: resultadoEmEvolucao,
    });
    expect(vars.LEAD_NAME).toBe('estudante');
  });

  it('arredonda percentages fracionados', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: {
        ...resultadoEmEvolucao,
        scores: [
          { categoria: 'clarezaDirecao', score: 2, maxScore: 9, percentage: 22.22 },
          { categoria: 'consistencia', score: 1, maxScore: 3, percentage: 33.33 },
          { categoria: 'qualidadeMetodo', score: 5, maxScore: 9, percentage: 55.55 },
          { categoria: 'retencao', score: 5, maxScore: 6, percentage: 83.33 },
        ],
      },
    });
    expect(vars.DIRECTION_SCORE).toBe('22');
    expect(vars.CONSISTENCY_SCORE).toBe('33');
    expect(vars.METHOD_SCORE).toBe('56');
    expect(vars.RETENTION_SCORE).toBe('83');
  });

  it('inclui CTA_URL', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: resultadoEmEvolucao,
    });
    expect(vars.CTA_URL).toBe('https://app.maximizeenfermagem.com.br');
  });
});

describe('PERFIL_TO_RESEND_TEMPLATE_ID', () => {
  it('mapeia os 4 perfis para template ids correspondentes (com slugs exatos do Resend)', () => {
    // Estes valores precisam bater EXATAMENTE com os ids dos templates no
    // painel Resend. Resend strip diacríticos no slug, daí o "diagnstico"
    // sem 'ó' em 3 dos 4 ids.
    expect(PERFIL_TO_RESEND_TEMPLATE_ID.sobrecarregado).toBe(
      'diagnostico-estudante-sobrecarregado',
    );
    expect(PERFIL_TO_RESEND_TEMPLATE_ID.esforcado_sem_direcao).toBe(
      'diagnstico-esforado-sem-direo',
    );
    expect(PERFIL_TO_RESEND_TEMPLATE_ID.em_evolucao).toBe(
      'diagnstico-estudante-em-evoluo',
    );
    expect(PERFIL_TO_RESEND_TEMPLATE_ID.estrategico).toBe(
      'diagnstico-estudante-estratgico',
    );
  });
});
