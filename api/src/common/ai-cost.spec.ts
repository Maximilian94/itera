import {
  AiUsageMeter,
  DEFAULT_OCR_PAGE_USD,
  DEFAULT_WEB_SEARCH_CALL_USD,
  MODEL_PRICES,
  priceOf,
  readUsage,
} from './ai-cost';

describe('readUsage', () => {
  it('lê o formato do Chat Completions (prompt/completion)', () => {
    expect(
      readUsage({ usage: { prompt_tokens: 1000, completion_tokens: 200 } }),
    ).toEqual({ inputTokens: 1000, outputTokens: 200 });
  });

  it('lê o formato da Responses API (input/output)', () => {
    expect(
      readUsage({ usage: { input_tokens: 500, output_tokens: 50 } }),
    ).toEqual({ inputTokens: 500, outputTokens: 50 });
  });

  it('resposta sem usage vira zero (nunca quebra a operação)', () => {
    expect(readUsage({})).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(readUsage(null)).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(readUsage({ usage: { prompt_tokens: 'x' } })).toEqual({
      inputTokens: 0,
      outputTokens: 0,
    });
  });
});

describe('priceOf', () => {
  it('cobra entrada e saída pela tabela do modelo', () => {
    // 1M in a $0,40 + 1M out a $1,60 = $2,00
    expect(
      priceOf('gpt-4.1-mini', {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBeCloseTo(2, 6);
  });

  it('o mini é bem mais barato que o gpt-4.1 no mesmo uso', () => {
    const usage = { inputTokens: 100_000, outputTokens: 2_000 };
    expect(priceOf('gpt-4.1-mini', usage)).toBeLessThan(
      priceOf('gpt-4.1', usage) / 4,
    );
  });

  it('modelo desconhecido cai no preço do mini em vez de zerar', () => {
    const usage = { inputTokens: 10_000, outputTokens: 100 };
    expect(priceOf('modelo-que-nao-existe', usage)).toBe(
      priceOf('gpt-4.1-mini', usage),
    );
    expect(MODEL_PRICES['gpt-4.1-mini']).toBeDefined();
  });
});

describe('AiUsageMeter', () => {
  it('soma as chamadas da operação e guarda o detalhe de cada uma', () => {
    const meter = new AiUsageMeter();
    meter.record('raspagem', 'gpt-4.1-mini', {
      usage: { prompt_tokens: 6_700, completion_tokens: 300 },
    });
    meter.record('busca web', 'gpt-4.1-mini', {
      usage: { input_tokens: 5_000, output_tokens: 100 },
    });

    const { usd, entries } = meter.report();
    expect(entries).toHaveLength(2);
    expect(entries[0].label).toBe('raspagem');
    // (6700 + 5000) in + (300 + 100) out, tudo no mini
    expect(usd).toBeCloseTo((11_700 * 0.4) / 1e6 + (400 * 1.6) / 1e6, 6);
  });

  it('soma a taxa por chamada da busca web, que não vem no usage', () => {
    const meter = new AiUsageMeter();
    meter.recordWebSearchCall();
    expect(meter.report().usd).toBeCloseTo(DEFAULT_WEB_SEARCH_CALL_USD, 6);
  });

  it('aceita taxa customizada (o preço da OpenAI muda com o tempo)', () => {
    const meter = new AiUsageMeter(0.01);
    meter.recordWebSearchCall();
    expect(meter.report().usd).toBeCloseTo(0.01, 6);
  });

  it('medidor sem chamadas custa zero', () => {
    expect(new AiUsageMeter().report()).toEqual({ usd: 0, entries: [] });
  });

  it('cobra o OCR por página e diz quantas foram', () => {
    const meter = new AiUsageMeter();
    meter.recordOcr('OCR do edital', 200);

    const { usd, entries } = meter.report();
    expect(usd).toBeCloseTo(200 * DEFAULT_OCR_PAGE_USD, 6);
    expect(entries[0].label).toBe('OCR do edital (200 pág.)');
    // OCR não é por token: mostrar 0/0 evita fingir uma medição que não existe.
    expect(entries[0]).toMatchObject({ inputTokens: 0, outputTokens: 0 });
  });

  it('aceita preço de página customizado', () => {
    const meter = new AiUsageMeter(DEFAULT_WEB_SEARCH_CALL_USD, 0.005);
    meter.recordOcr('OCR', 10);
    expect(meter.report().usd).toBeCloseTo(0.05, 6);
  });

  it('OCR de zero página não vira linha (fallback pdf-parse é local e grátis)', () => {
    const meter = new AiUsageMeter();
    meter.recordOcr('OCR', 0);
    expect(meter.report()).toEqual({ usd: 0, entries: [] });
  });
});
