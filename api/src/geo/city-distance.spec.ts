import { estimateTravelMinutes } from './city-distance';

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
});
