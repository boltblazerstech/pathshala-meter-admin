import apiClient from '../lib/apiClient'
import type {
  Paathashaala,
  CreatePaathashaalaRequest,
  UpdatePaathashaalaRequest,
  PaginatedResponse,
} from '../types'

export interface ListPaathashaalaParams {
  page?: number
  limit?: number
  search?: string
  is_active?: boolean
}

// GET /paathshaalas
export async function listPaathshaalas(
  params?: ListPaathashaalaParams,
): Promise<PaginatedResponse<Paathashaala>> {
  const { data } = await apiClient.get<PaginatedResponse<Paathashaala>>('/paathshaalas', { params })
  return data
}

// GET /paathshaalas/:id
export async function getPaathashaala(id: string): Promise<Paathashaala> {
  const { data } = await apiClient.get<Paathashaala>(`/paathshaalas/${id}`)
  return data
}

// POST /paathshaalas
export async function createPaathashaala(payload: CreatePaathashaalaRequest): Promise<Paathashaala> {
  const { data } = await apiClient.post<Paathashaala>('/paathshaalas', payload)
  return data
}

// PATCH /paathshaalas/:id
export async function updatePaathashaala(
  id: string,
  payload: UpdatePaathashaalaRequest,
): Promise<Paathashaala> {
  const { data } = await apiClient.patch<Paathashaala>(`/paathshaalas/${id}`, payload)
  return data
}

// DELETE /paathshaalas/:id
export async function deletePaathashaala(id: string): Promise<void> {
  await apiClient.delete(`/paathshaalas/${id}`)
}
