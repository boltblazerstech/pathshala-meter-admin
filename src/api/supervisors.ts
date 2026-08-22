import apiClient from '../lib/apiClient'
import type {
  Supervisor,
  CreateSupervisorRequest,
  UpdateSupervisorRequest,
  PaginatedResponse,
} from '../types'

export interface ListSupervisorParams {
  page?: number
  limit?: number
  search?: string
  assigned_paathshaala_id?: string
  is_active?: boolean
}

// GET /supervisors
export async function listSupervisors(
  params?: ListSupervisorParams,
): Promise<PaginatedResponse<Supervisor>> {
  const { data } = await apiClient.get<PaginatedResponse<Supervisor>>('/supervisors', { params })
  return data
}

// GET /supervisors/:id
export async function getSupervisor(id: string): Promise<Supervisor> {
  const { data } = await apiClient.get<Supervisor>(`/supervisors/${id}`)
  return data
}

// POST /supervisors
export async function createSupervisor(payload: CreateSupervisorRequest): Promise<Supervisor> {
  const { data } = await apiClient.post<Supervisor>('/supervisors', payload)
  return data
}

// PATCH /supervisors/:id
export async function updateSupervisor(
  id: string,
  payload: UpdateSupervisorRequest,
): Promise<Supervisor> {
  const { data } = await apiClient.patch<Supervisor>(`/supervisors/${id}`, payload)
  return data
}

// DELETE /supervisors/:id
export async function deleteSupervisor(id: string): Promise<void> {
  await apiClient.delete(`/supervisors/${id}`)
}
