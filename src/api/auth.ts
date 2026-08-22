import apiClient from '../lib/apiClient'
import { setToken, clearToken } from '../lib/tokenStorage'
import type { LoginRequest, LoginResponse, AdminUser } from '../types'

// POST /auth/login
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
  const authToken = data.token || data.access_token
  if (authToken) {
    setToken(authToken)
  }
  return data
}

// POST /auth/logout
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearToken()
  }
}

// GET /auth/me
export async function getMe(): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>('/auth/me')
  return data
}
