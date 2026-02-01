import { getAuthToken } from './auth'

function getApiBaseUrl() {
  const raw =
    (import.meta as any).env?.VITE_API_URL?.toString() ?? 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
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
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
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

