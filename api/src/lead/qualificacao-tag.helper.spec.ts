import { computeTagsFromQualificacao } from './qualificacao-tag.helper';

describe('computeTagsFromQualificacao', () => {
  it('aplica todas as tags relevantes para o "lead quente"', () => {
    expect(
      computeTagsFromQualificacao({
        jaEnfermeiro: 'formado',
        trabalhaSaude: 'enfermeiro',
        estudandoConcurso: 'ativamente',
        intencaoConcurso: '3m',
      }),
    ).toEqual([
      'enfermeiro_formado',
      'trabalha_saude',
      'estudando_concurso',
      'intencao_concurso_3m',
    ]);
  });

  it('não aplica trabalha_saude quando "nao"', () => {
    const tags = computeTagsFromQualificacao({
      jaEnfermeiro: 'em_formacao',
      trabalhaSaude: 'nao',
      estudandoConcurso: 'pouco',
      intencaoConcurso: '6m',
    });
    expect(tags).toContain('enfermeiro_em_formacao');
    expect(tags).toContain('intencao_concurso_6m');
    expect(tags).not.toContain('trabalha_saude');
    expect(tags).not.toContain('estudando_concurso');
  });

  it('lead frio: nao_enfermeiro, indecisão, sem trabalho na saúde', () => {
    expect(
      computeTagsFromQualificacao({
        jaEnfermeiro: 'nao',
        trabalhaSaude: 'nao',
        estudandoConcurso: 'nao',
        intencaoConcurso: 'nao_decidiu',
      }),
    ).toEqual(['nao_enfermeiro']);
  });

  it('mapeia trabalha_saude para "outra_funcao"', () => {
    const tags = computeTagsFromQualificacao({
      jaEnfermeiro: 'em_formacao',
      trabalhaSaude: 'outra_funcao',
      estudandoConcurso: 'pouco',
      intencaoConcurso: '12m',
    });
    expect(tags).toContain('trabalha_saude');
    expect(tags).toContain('intencao_concurso_12m');
  });
});
