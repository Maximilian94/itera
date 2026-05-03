import 'reflect-metadata';
import type { DiagnosticoResultado } from '@domain/diagnostico/diagnostico.interface';
import { buildDiagnosticoResultadoVariables } from './diagnostico-resultado.template';

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
  it('mapeia categorias para variáveis SCORE_* com sufixo %', () => {
    const vars = buildDiagnosticoResultadoVariables({
      firstName: 'Fulana',
      resultado: resultadoEmEvolucao,
    });

    expect(vars.SCORE_CLAREZA).toBe('67%');
    expect(vars.SCORE_CONSISTENCIA).toBe('67%');
    expect(vars.SCORE_METODO).toBe('33%');
    expect(vars.SCORE_RETENCAO).toBe('83%');
  });

  it('converte categorias de pontoForte/pontoAtencao para labels PT-BR', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: resultadoEmEvolucao,
    });

    expect(vars.PONTO_FORTE).toBe('Retenção');
    expect(vars.PONTO_ATENCAO).toBe('Qualidade do Método');
  });

  it('saúda usando firstName quando presente', () => {
    const vars = buildDiagnosticoResultadoVariables({
      firstName: '  Fulana  ',
      resultado: resultadoEmEvolucao,
    });
    expect(vars.GREETING).toBe('Olá, Fulana!');
  });

  it('cai em "Olá!" sem firstName', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: resultadoEmEvolucao,
    });
    expect(vars.GREETING).toBe('Olá!');
  });

  it('renderiza perfil_sobrecarregado com totalScore baixo', () => {
    const vars = buildDiagnosticoResultadoVariables({
      resultado: {
        ...resultadoEmEvolucao,
        totalScore: 4,
        perfil: {
          slug: 'sobrecarregado',
          nome: 'Estudante Sobrecarregado',
          mensagemPrincipal: 'Você não precisa estudar mais conteúdos...',
        },
      },
    });
    expect(vars.TOTAL_SCORE).toBe('4');
    expect(vars.PERFIL_NOME).toBe('Estudante Sobrecarregado');
    expect(vars.PERFIL_MENSAGEM).toContain('Você não precisa');
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
    expect(vars.SCORE_CLAREZA).toBe('22%');
    expect(vars.SCORE_CONSISTENCIA).toBe('33%');
    expect(vars.SCORE_METODO).toBe('56%');
    expect(vars.SCORE_RETENCAO).toBe('83%');
  });
});
