import { estimateTravelMinutes, resolveCoords } from './city-distance';

describe('estimateTravelMinutes', () => {
  it('mesma cidade (normalizada, com acentos/caixa) → 0', () => {
    expect(
      estimateTravelMinutes(
        { state: 'SP', city: 'São Paulo' },
        { state: 'sp', city: '  sao paulo ' },
      ),
    ).toBe(0);
  });

  it('cidades vizinhas → estimativa curta (Niterói ↔ São Gonçalo)', () => {
    const minutes = estimateTravelMinutes(
      { state: 'RJ', city: 'Niterói' },
      { state: 'RJ', city: 'São Gonçalo' },
    );
    expect(minutes).not.toBeNull();
    expect(minutes!).toBeGreaterThan(0);
    expect(minutes!).toBeLessThanOrEqual(30);
  });

  it('cidades distantes → estimativa longa (Campinas ↔ Manaus)', () => {
    const minutes = estimateTravelMinutes(
      { state: 'SP', city: 'Campinas' },
      { state: 'AM', city: 'Manaus' },
    );
    expect(minutes!).toBeGreaterThan(20 * 60);
  });

  it('cidade fora da base IBGE → null (não geocodificável)', () => {
    expect(
      estimateTravelMinutes(
        { state: 'SP', city: 'Campinas' },
        { state: 'SP', city: 'Cidade Fantasia do Norte' },
      ),
    ).toBeNull();
  });

  it('state/city ausentes → null', () => {
    expect(
      estimateTravelMinutes(
        { state: 'SP', city: 'Campinas' },
        { state: 'SP', city: null },
      ),
    ).toBeNull()
    expect(
      estimateTravelMinutes(
        { state: 'SP', city: 'Campinas' },
        { state: null, city: 'Santos' },
      ),
    ).toBeNull()
  });

  it('mesmo nome em UF diferente não colide (Bom Jesus RS × PI)', () => {
    const rs = estimateTravelMinutes(
      { state: 'RS', city: 'Porto Alegre' },
      { state: 'RS', city: 'Bom Jesus' },
    );
    const pi = estimateTravelMinutes(
      { state: 'RS', city: 'Porto Alegre' },
      { state: 'PI', city: 'Bom Jesus' },
    );
    expect(rs).not.toBeNull();
    expect(pi).not.toBeNull();
    expect(pi!).toBeGreaterThan(rs!);
  });

  /* A grafia com hífen aparece nos editais; a base IBGE guarda com espaço.
   * Antes da normalização simétrica isto era null e o concurso sumia do
   * matching por proximidade. */
  it('hífen na grafia não impede o match (São João del-Rei)', () => {
    expect(
      estimateTravelMinutes(
        { state: 'MG', city: 'São João del-Rei' },
        { state: 'MG', city: 'São João del Rei' },
      ),
    ).toBe(0);
  });

  /* O contrapeso do teste acima: tirar hífen dos dois lados não pode quebrar
   * os municípios cujo nome oficial TEM hífen. */
  it('município com hífen no nome oficial continua geocodificável', () => {
    expect(resolveCoords({ state: 'MA', city: 'Apicum-Açu' })).not.toBeNull();
    expect(
      resolveCoords({ state: 'RO', city: "Alta Floresta d'Oeste" }),
    ).not.toBeNull();
    expect(resolveCoords({ state: 'SP', city: 'Biritiba-Mirim' })).not.toBeNull();
  });
});

describe('resolveCoords', () => {
  it('cidade conhecida → centroide do município', () => {
    const p = resolveCoords({ state: 'SP', city: 'São Paulo' });
    expect(p?.precision).toBe('city');
    expect(p!.lat).toBeCloseTo(-23.55, 1);
    expect(p!.lng).toBeCloseTo(-46.63, 1);
  });

  it('sem cidade → centroide da UF', () => {
    const p = resolveCoords({ state: 'BA', city: null });
    expect(p?.precision).toBe('state');
    /* Dentro da caixa aproximada da Bahia. */
    expect(p!.lat).toBeGreaterThan(-19);
    expect(p!.lat).toBeLessThan(-8);
    expect(p!.lng).toBeGreaterThan(-47);
    expect(p!.lng).toBeLessThan(-37);
  });

  it('cidade que não existe cai no centroide da UF (não vira null)', () => {
    /* "Oeste do Paraná" é região, não município: ainda assim o concurso
     * merece um ponto no mapa, só que com precisão de estado. */
    const p = resolveCoords({ state: 'PR', city: 'Oeste do Paraná' });
    expect(p?.precision).toBe('state');
  });

  it('sem UF → null (fica fora do mapa, por decisão)', () => {
    expect(resolveCoords({ state: null, city: 'Brasília' })).toBeNull();
    expect(resolveCoords({ state: null, city: null })).toBeNull();
  });
});
