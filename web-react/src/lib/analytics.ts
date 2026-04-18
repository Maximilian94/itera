import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://eu.i.posthog.com'

let initialized = false

function init() {
  if (initialized) return
  if (!KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-sensitive]',
    },
  })
  initialized = true
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

function pageview() {
  if (!initialized) return
  posthog.capture('$pageview')
}

function identify(
  distinctId: string,
  properties?: Record<string, unknown>,
) {
  if (!initialized) return
  posthog.identify(distinctId, properties)
}

function reset() {
  if (!initialized) return
  posthog.reset()
}

export const analytics = { init, capture, pageview, identify, reset }
