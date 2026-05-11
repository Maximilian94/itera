/**
 * Meta Pixel — port idempotente do snippet oficial em TS, gated por consent.
 *
 * Diferente do snippet padrão (que injeta tudo no <head> e dispara PageView
 * imediatamente), aqui o Pixel **só é carregado depois do opt-in** via
 * analytics.optIn(). Antes disso, nenhum request pro Meta acontece — o
 * `<noscript>` fallback do snippet oficial foi propositalmente deixado de
 * fora porque dispara independente de consent (fere LGPD).
 *
 * Configure `NEXT_PUBLIC_META_PIXEL_ID` no .env.local. Sem o ID, todas as
 * funções viram no-op (mesmo padrão de PostHog quando POSTHOG_KEY ausente).
 */

interface FbqQueueItem {
  // fbq aceita N args variados; preservamos como tuple genérica.
  readonly args: unknown[];
}

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: FbqQueueItem[] | unknown[];
  loaded?: boolean;
  version?: string;
  push?: FbqFunction;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
/**
 * Test Event Code do Meta. Quando setado, todos os eventos disparados vão
 * pra aba "Test events" do dataset em tempo real, em vez de só pro
 * Overview (que tem delay de 15-60min). Útil pra validar setup em dev.
 * **Não setar em produção** — eventos com test code não viram conversões
 * reais. Encontrado no painel Meta → Events Manager → seu dataset →
 * aba "Test events" (campo destacado no topo).
 */
const TEST_EVENT_CODE = process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE;
const PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

let initialized = false;

function ensureFbqStub(): FbqFunction {
  if (window.fbq) return window.fbq;

  // Mirror do snippet oficial: fbq vira tanto função quanto holding object.
  const fbq: FbqFunction = function (this: unknown, ...args: unknown[]): void {
    if (fbq.callMethod) {
      fbq.callMethod.apply(this, args);
    } else {
      (fbq.queue as unknown[]).push(args);
    }
  } as FbqFunction;

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  return fbq;
}

function injectScript(): void {
  // Idempotência: se já tem <script> com a src, pula.
  if (document.querySelector(`script[src="${PIXEL_SCRIPT_SRC}"]`)) return;
  const t = document.createElement("script");
  t.async = true;
  t.src = PIXEL_SCRIPT_SRC;
  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(t, first);
}

export function init(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!PIXEL_ID) return;

  const fbq = ensureFbqStub();
  injectScript();
  fbq("init", PIXEL_ID);
  initialized = true;
}

function buildOptions(options?: TrackOptions): Record<string, string> | undefined {
  const merged: Record<string, string> = {};
  if (options?.eventID) merged.eventID = options.eventID;
  if (TEST_EVENT_CODE) merged.test_event_code = TEST_EVENT_CODE;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function pageView(): void {
  if (!initialized || typeof window === "undefined" || !window.fbq) return;
  const opts = buildOptions();
  if (opts) {
    window.fbq("track", "PageView", {}, opts);
  } else {
    window.fbq("track", "PageView");
  }
}

interface TrackOptions {
  /** event_id pra deduplicação Pixel + CAPI (mesmo id nos dois lados). */
  eventID?: string;
}

export function track(
  event: string,
  params?: Record<string, unknown>,
  options?: TrackOptions,
): void {
  if (!initialized || typeof window === "undefined" || !window.fbq) return;
  const opts = buildOptions(options);
  if (opts) {
    window.fbq("track", event, params ?? {}, opts);
  } else {
    window.fbq("track", event, params ?? {});
  }
}

export function isInitialized(): boolean {
  return initialized;
}

export const metaPixel = { init, pageView, track, isInitialized };
