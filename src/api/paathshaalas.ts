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
  size?: number
  search?: string
  is_active?: boolean
}

// GET /paathshaalas
export async function listPaathshaalas(
  params?: ListPaathashaalaParams,
): Promise<PaginatedResponse<Paathashaala>> {
  const queryParams: Record<string, any> = {}
  if (params?.page !== undefined) {
    queryParams.page = Math.max(0, params.page - 1)
  }
  if (params?.limit !== undefined || params?.size !== undefined) {
    queryParams.size = params.size ?? params.limit
    queryParams.limit = params.limit ?? params.size
  }
  if (params?.search) queryParams.search = params.search
  if (params?.is_active !== undefined) queryParams.is_active = params.is_active

  const { data } = await apiClient.get<PaginatedResponse<Paathashaala>>('/paathshaalas', { params: queryParams })
  return data
}

// GET /paathshaalas/:id
export async function getPaathashaala(id: string): Promise<Paathashaala> {
  const { data } = await apiClient.get<Paathashaala>(`/paathshaalas/${id}`)
  return data
}

// POST /paathshaalas
export async function createPaathashaala(payload: CreatePaathashaalaRequest): Promise<Paathashaala> {
  const body = {
    name: payload.name,
    map_link: payload.map_link,
    source_map_link: payload.map_link,
  }
  const { data } = await apiClient.post<Paathashaala>('/paathshaalas', body)
  return data
}

// PUT or PATCH /paathshaalas/:id
export async function updatePaathashaala(
  id: string,
  payload: UpdatePaathashaalaRequest,
): Promise<Paathashaala> {
  const body: Record<string, any> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.map_link !== undefined) {
    body.map_link = payload.map_link
    body.source_map_link = payload.map_link
  }

  try {
    const { data } = await apiClient.put<Paathashaala>(`/paathshaalas/${id}`, body)
    return data
  } catch (err: any) {
    if (err.response?.status === 405) {
      const { data } = await apiClient.patch<Paathashaala>(`/paathshaalas/${id}`, body)
      return data
    }
    throw err
  }
}

// DELETE /paathshaalas/:id
export async function deletePaathashaala(id: string): Promise<void> {
  await apiClient.delete(`/paathshaalas/${id}`)
}
