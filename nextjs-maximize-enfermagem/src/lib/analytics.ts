import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;

function init() {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

function pageview() {
  if (!initialized) return;
  posthog.capture("$pageview");
}

export const analytics = { init, capture, pageview };
