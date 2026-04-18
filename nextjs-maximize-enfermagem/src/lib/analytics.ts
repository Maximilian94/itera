import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const CONSENT_KEY = "maximize:posthog_consent";
type Consent = "accepted" | "rejected";

let initialized = false;

function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

function init() {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    persistence: "localStorage+cookie",
    // LGPD: nothing is sent until the user opts in via the consent banner.
    opt_out_capturing_by_default: true,
  });
  initialized = true;

  const consent = getConsent();
  if (consent === "accepted") posthog.opt_in_capturing();
  if (consent === "rejected") posthog.opt_out_capturing();
}

function optIn() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "accepted");
  if (initialized) posthog.opt_in_capturing();
}

function optOut() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "rejected");
  if (initialized) posthog.opt_out_capturing();
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

function pageview() {
  if (!initialized) return;
  posthog.capture("$pageview");
}

export const analytics = {
  init,
  capture,
  pageview,
  optIn,
  optOut,
  getConsent,
};
