function getApiBaseUrl() {
  const raw =
    (import.meta as any).env?.VITE_API_URL?.toString() ?? 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

let tokenGetter: (() => Promise<string | null>) | null = null

export function setApiTokenGetter(getter: (() => Promise<string | null>) | null) {
  tokenGetter = getter
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, opts: { status: number; body: unknown }) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status
    this.body = opts.body
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`

  const headers = new Headers(init.headers)
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (!headers.has('Authorization') && tokenGetter) {
    const token = await tokenGetter()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const res = await fetch(url, { ...init, headers })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const message =
      (typeof body === 'object' &&
        body &&
        'message' in body &&
        typeof (body as any).message === 'string' &&
        (body as any).message) ||
      `Request failed (${res.status})`
    throw new ApiError(message, { status: res.status, body })
  }

  return body as T
}

