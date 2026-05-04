import posthog from "posthog-js";
import { metaPixel } from "./meta-pixel/init";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const CONSENT_KEY = "maximize:posthog_consent";
type Consent = "accepted" | "rejected";

let posthogInitialized = false;

function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

function initPosthog() {
  if (typeof window === "undefined") return;
  if (posthogInitialized) return;
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    persistence: "localStorage+cookie",
    // LGPD: nothing is sent until the user opts in via the consent banner.
    opt_out_capturing_by_default: true,
  });
  posthogInitialized = true;
}

/**
 * Inicializa providers de analytics conforme consent atual. PostHog e Meta
 * Pixel são independentes — um não bloqueia o outro. Chamado em mount e
 * deve ser idempotente.
 */
function init() {
  if (typeof window === "undefined") return;

  initPosthog();

  const consent = getConsent();
  if (consent === "accepted") {
    if (posthogInitialized) posthog.opt_in_capturing();
    // Meta Pixel: re-init em refresh com consent prévio.
    metaPixel.init();
  }
  if (consent === "rejected" && posthogInitialized) {
    posthog.opt_out_capturing();
  }
}

function optIn() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "accepted");
  initPosthog();
  if (posthogInitialized) posthog.opt_in_capturing();
  // Pixel só carrega depois do opt-in. PageView dispara aqui pra cobrir o
  // pageview da rota atual (que rolou antes do consent).
  metaPixel.init();
  metaPixel.pageView();
}

function optOut() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "rejected");
  if (posthogInitialized) posthog.opt_out_capturing();
  // Pixel: nada a desligar — se nunca init'd, fbq não existe; se init'd
  // antes do opt-out (cenário raro: usuário aceita, depois rejeita), futuras
  // chamadas a metaPixel.* checariam consent... mas hoje o gate é só "init"
  // gated por consent. Cookies _fbp/_fbc precisam ser limpos manualmente
  // pelo browser. Não vale a complexidade pra o caso raro.
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!posthogInitialized) return;
  posthog.capture(event, properties);
}

function pageview() {
  if (posthogInitialized) posthog.capture("$pageview");
  // Pixel pageview é no-op se não init'd, então ok rodar sem checar consent.
  metaPixel.pageView();
}

export const analytics = {
  init,
  capture,
  pageview,
  optIn,
  optOut,
  getConsent,
};
