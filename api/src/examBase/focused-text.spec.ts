import { buildFocusedText } from './focused-text';

/**
 * Monta um edital sintético com a mesma ANATOMIA dos reais: quadro de vagas no
 * começo, anexo de atribuições no meio (uma seção por cargo) e anexo de
 * conteúdo programático no fim. As duas falhas relatadas em produção — o cargo
 * de enfermagem "secundário" ficar sem atribuições e a description vir com a
 * lista de matérias — nascem dessa ordem.
 */
function buildEdital(): {
  text: string;
  atribuicoesEnfermeiro: string;
  atribuicoesPlantonista: string;
  conteudoProgramatico: string;
} {
  const filler = (tag: string, n: number) =>
    Array.from(
      { length: n },
      (_, i) => `${tag} parágrafo ${i} de texto corrido do edital.`,
    ).join('\n');

  const atribuicoesEnfermeiro =
    'Prestar assistência de enfermagem ao paciente na unidade básica de saúde.';
  const atribuicoesPlantonista =
    'Realizar o acolhimento com classificação de risco durante o plantão noturno.';
  const conteudoProgramatico =
    'Língua Portuguesa: interpretação de texto; ortografia; crase.';

  const text = [
    'EDITAL DE CONCURSO PÚBLICO Nº 001/2026',
    '',
    'ANEXO I — QUADRO DE VAGAS',
    '| Cargo | Vagas | Salário |',
    '| Enfermeiro | 5 | 4750,00 |',
    '| Enfermeiro Plantonista | 2 | 5100,00 |',
    '| Motorista | 3 | 1600,00 |',
    '',
    filler('capitulo-2', 400),
    // Muitas menções soltas no miolo: é isto que estoura o limite de
    // ocorrências e faz o corte cego pelas pontas perder o anexo de baixo.
    ...Array.from(
      { length: 30 },
      (_, i) =>
        `${i}. O candidato ao cargo de Enfermeiro deverá observar o item 4.${i}.`,
    ),
    filler('capitulo-3', 400),
    '',
    'ANEXO II — ATRIBUIÇÕES DOS CARGOS',
    '',
    'ENFERMEIRO',
    atribuicoesEnfermeiro,
    filler('atribuicoes-enfermeiro', 40),
    '',
    'ENFERMEIRO PLANTONISTA',
    atribuicoesPlantonista,
    filler('atribuicoes-plantonista', 40),
    '',
    filler('capitulo-4', 400),
    '',
    'ANEXO III — CONTEÚDO PROGRAMÁTICO',
    '',
    'ENFERMEIRO',
    conteudoProgramatico,
    filler('programa-enfermeiro', 40),
    '',
    'ENFERMEIRO PLANTONISTA',
    conteudoProgramatico,
    filler('programa-plantonista', 40),
  ].join('\n');

  return {
    text,
    atribuicoesEnfermeiro,
    atribuicoesPlantonista,
    conteudoProgramatico,
  };
}

describe('buildFocusedText', () => {
  const roles = ['Enfermeiro', 'Enfermeiro Plantonista', 'Motorista'];

  it('leva as atribuições do cargo, não o conteúdo programático', () => {
    const { text, atribuicoesEnfermeiro, conteudoProgramatico } = buildEdital();

    const focused = buildFocusedText(text, ['Enfermeiro'], {
      allRoles: roles,
      purpose: 'fichas',
    });

    expect(focused).toContain(atribuicoesEnfermeiro);
    expect(focused).not.toContain(conteudoProgramatico);
  });

  it('leva o conteúdo programático quando o pedido é o quadro de matérias', () => {
    const { text, conteudoProgramatico } = buildEdital();

    const focused = buildFocusedText(text, ['Enfermeiro'], {
      allRoles: roles,
      purpose: 'syllabus',
    });

    expect(focused).toContain(conteudoProgramatico);
  });

  it('dá ao cargo secundário de enfermagem a seção DELE', () => {
    const { text, atribuicoesPlantonista } = buildEdital();

    const focused = buildFocusedText(text, ['Enfermeiro Plantonista'], {
      allRoles: roles,
      purpose: 'fichas',
    });

    expect(focused).toContain(atribuicoesPlantonista);
  });

  it('não deixa o cargo genérico herdar as ocorrências do específico', () => {
    const text = [
      'ANEXO — ATRIBUIÇÕES',
      'ENFERMEIRO PLANTONISTA',
      'ALVO-DO-PLANTONISTA',
    ].join('\n');

    const hits = buildFocusedText(text, ['Enfermeiro'], {
      allRoles: ['Enfermeiro', 'Enfermeiro Plantonista'],
      purpose: 'fichas',
    });

    // Sem cargo próprio no texto, a rejeição zera os hits e a função cai no
    // texto inteiro — nunca num recorte que é do vizinho apresentado como dele.
    expect(hits).toBe(text);
  });

  it('casa o cargo mesmo com acento e caixa diferentes do edital', () => {
    const text = [
      'ANEXO — ATRIBUIÇÕES DOS CARGOS',
      'Técnico em Enfermagem',
      'ALVO-DO-TECNICO',
    ].join('\n');

    const focused = buildFocusedText(text, ['TÉCNICO EM ENFERMAGEM'], {
      purpose: 'fichas',
    });

    expect(focused).toContain('ALVO-DO-TECNICO');
  });

  it('reparte o orçamento entre os cargos do lote', () => {
    const { text } = buildEdital();

    const focused = buildFocusedText(text, roles, {
      allRoles: roles,
      purpose: 'fichas',
      maxChars: 60_000,
    });

    // Cada cargo do lote precisa aparecer no recorte: o orçamento é dividido,
    // não consumido pelo primeiro.
    for (const role of roles) {
      expect(focused.toUpperCase()).toContain(role.toUpperCase());
    }
  });

  it('devolve o texto inteiro quando nenhum cargo é encontrado', () => {
    const text = 'Edital sem nenhum dos cargos procurados.';
    expect(buildFocusedText(text, ['Enfermeiro'])).toBe(text);
  });

  it('preserva os offsets ao fatiar texto acentuado', () => {
    const text = `${'ç'.repeat(5_000)}\nENFERMEIRO\nMARCADOR-UNICO`;
    const focused = buildFocusedText(text, ['Enfermeiro']);
    expect(focused).toContain('MARCADOR-UNICO');
  });
});
