import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from './toast'
import { getToken, clearToken } from './tokenStorage'

// ---------------------------------------------------------------------------
// Config — driven entirely by VITE_API_BASE_URL
// Change this one env var to point at any backend.
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.placeholder.local/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request interceptor — attach JWT ────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — handle 401 + global error toast ──────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // ── 401 → clear token and redirect to login ─────────────────────────────
    if (error.response?.status === 401) {
      clearToken()
      // Only redirect if we aren't already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // ── Non-2xx → show error toast ─────────────────────────────────────────
    if (error.response) {
      const status = error.response.status
      const responseData = error.response.data as { message?: string } | undefined
      const message = responseData?.message ?? `Request failed (${status})`
      toast.error(message)
    } else if (error.request) {
      toast.error('Network error — please check your connection.')
    } else {
      toast.error(error.message ?? 'An unexpected error occurred.')
    }

    return Promise.reject(error)
  },
)

export default apiClient
