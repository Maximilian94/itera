import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  'https://eu.i.posthog.com'

let initialized = false

function isMobileViewport() {
  if (typeof window === 'undefined') return false

  const hasTouchPoints = navigator.maxTouchPoints > 0
  const mobileUserAgent =
    /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(
      navigator.userAgent,
    )

  return window.innerWidth <= 767 || (mobileUserAgent && hasTouchPoints)
}

function registerDeviceProperties() {
  if (!initialized) return

  posthog.register({
    is_mobile: isMobileViewport(),
  })
}

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
  registerDeviceProperties()
  window.addEventListener('resize', registerDeviceProperties)
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
  posthog.identify(distinctId, {
    ...properties,
    is_mobile: isMobileViewport(),
  })
}

function reset() {
  if (!initialized) return
  posthog.reset()
}

export const analytics = { init, capture, pageview, identify, reset }
