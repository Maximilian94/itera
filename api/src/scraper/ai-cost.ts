/**
 * Medição de custo das chamadas de IA de UMA operação.
 *
 * Motivo: a busca de link dispara várias chamadas (busca web, saltos pelo site
 * da banca, verificação de cada candidata) e o gasto só aparecia no painel da
 * OpenAI, no dia seguinte e agregado. Aqui somamos por operação para o admin
 * ver o preço do clique que acabou de dar.
 *
 * Preços em USD por 1 milhão de tokens. Módulo puro (testável).
 */
export interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  'gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8 },
  'gpt-4.1-nano': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  // ⚠️ Preços da família gpt-5.x: confira em platform.openai.com/pricing e
  // ajuste — a estimativa de custo na tela depende desta tabela.
  'gpt-5.6-sol': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gpt-5.6-luna': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gpt-5.6-terra': { inputPerMillion: 1.25, outputPerMillion: 10 },
};

/** Modelo desconhecido cai no mini — melhor estimar do que não mostrar nada. */
const FALLBACK_PRICE = MODEL_PRICES['gpt-4.1-mini'];

/**
 * Taxa fixa por chamada da tool `web_search_preview`, que NÃO aparece em
 * `usage` (é cobrada por chamada, à parte dos tokens).
 *
 * ⚠️ É o número menos confiável desta conta: a OpenAI já mudou esse preço
 * algumas vezes e ele não vem na resposta da API. Confira em
 * platform.openai.com/usage (linha "web search tool calls") e ajuste por
 * `OPENAI_WEB_SEARCH_CALL_USD` se estiver diferente.
 */
export const DEFAULT_WEB_SEARCH_CALL_USD = 0.025;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Uma chamada registrada, já precificada. */
export interface CostEntry {
  /** Rótulo curto do passo, p/ o admin entender o que gastou. */
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
}

export interface CostReport {
  usd: number;
  entries: CostEntry[];
}

/** Extrai tokens do `usage` da OpenAI (Chat Completions ou Responses API). */
export function readUsage(raw: unknown): TokenUsage {
  const u = (raw as { usage?: Record<string, unknown> } | null)?.usage ?? {};
  const num = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : 0);
  return {
    // Chat Completions usa prompt/completion; Responses usa input/output.
    inputTokens: num(u.prompt_tokens) || num(u.input_tokens),
    outputTokens: num(u.completion_tokens) || num(u.output_tokens),
  };
}

export function priceOf(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICES[model] ?? FALLBACK_PRICE;
  return (
    (usage.inputTokens * p.inputPerMillion) / 1_000_000 +
    (usage.outputTokens * p.outputPerMillion) / 1_000_000
  );
}

/**
 * Acumulador de UMA operação. Não é injetável de propósito: cada request cria o
 * seu, senão requests simultâneos somariam no mesmo balde.
 */
export class AiUsageMeter {
  private readonly items: CostEntry[] = [];

  constructor(
    private readonly webSearchCallUsd = DEFAULT_WEB_SEARCH_CALL_USD,
  ) {}

  /** Registra uma chamada a partir do corpo bruto da resposta da OpenAI. */
  record(label: string, model: string, raw: unknown): void {
    const usage = readUsage(raw);
    this.items.push({
      label,
      model,
      ...usage,
      usd: priceOf(model, usage),
    });
  }

  /** Taxa por chamada da busca web (fora dos tokens). */
  recordWebSearchCall(): void {
    this.items.push({
      label: 'busca web (taxa por chamada)',
      model: 'web_search_preview',
      inputTokens: 0,
      outputTokens: 0,
      usd: this.webSearchCallUsd,
    });
  }

  report(): CostReport {
    return {
      usd: this.items.reduce((sum, i) => sum + i.usd, 0),
      entries: [...this.items],
    };
  }
}
