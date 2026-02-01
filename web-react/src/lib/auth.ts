export const AUTH_TOKEN_STORAGE_KEY = 'itera.authToken'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string) {
  try {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  } catch {
    // ignore (e.g. disabled storage)
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}

