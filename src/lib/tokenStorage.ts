// ---------------------------------------------------------------------------
// Token storage — thin wrapper over localStorage
// Swap to sessionStorage or httpOnly cookies by changing this file only.
// ---------------------------------------------------------------------------

const ACCESS_KEY = 'admin_token'

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_KEY) || localStorage.getItem('pm_access_token')
}

export function setToken(accessToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem('pm_access_token')
}
