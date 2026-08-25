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
  size?: number
  search?: string
  assigned_paathshaala_id?: string
  is_active?: boolean
}

// GET /supervisors
export async function listSupervisors(
  params?: ListSupervisorParams,
): Promise<PaginatedResponse<Supervisor>> {
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

  const { data } = await apiClient.get<PaginatedResponse<Supervisor>>('/supervisors', { params: queryParams })
  return data
}

// GET /supervisors/:id
export async function getSupervisor(id: string): Promise<Supervisor> {
  const { data } = await apiClient.get<Supervisor>(`/supervisors/${id}`)
  return data
}

// POST /supervisors
export async function createSupervisor(payload: CreateSupervisorRequest): Promise<Supervisor> {
  const body: Record<string, any> = {
    name: payload.name,
    phone_number: payload.phone_number || payload.phone,
    phone: payload.phone || payload.phone_number,
  }
  if (payload.password) body.password = payload.password

  const { data } = await apiClient.post<Supervisor>('/supervisors', body)
  return data
}

// PUT or PATCH /supervisors/:id
export async function updateSupervisor(
  id: string,
  payload: UpdateSupervisorRequest,
): Promise<Supervisor> {
  const body: Record<string, any> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.phone_number !== undefined || payload.phone !== undefined) {
    body.phone_number = payload.phone_number || payload.phone
    body.phone = payload.phone || payload.phone_number
  }
  if (payload.password) body.password = payload.password
  if (payload.active !== undefined || payload.is_active !== undefined) {
    body.active = payload.active ?? payload.is_active
    body.is_active = payload.is_active ?? payload.active
  }

  // Support both PUT (Spring backend) and PATCH
  try {
    const { data } = await apiClient.put<Supervisor>(`/supervisors/${id}`, body)
    return data
  } catch (err: any) {
    if (err.response?.status === 405) {
      const { data } = await apiClient.patch<Supervisor>(`/supervisors/${id}`, body)
      return data
    }
    throw err
  }
}

// PATCH /api/admin/supervisors/{id}/selected-paathshaala
export async function updateSupervisorSelectedPaathshaala(
  id: string,
  paathshaalaId: string | null
): Promise<Supervisor> {
  const { data } = await apiClient.patch<Supervisor>(`/supervisors/${id}/selected-paathshaala`, {
    paathshaala_id: paathshaalaId
  })
  return data
}

// DELETE /supervisors/:id
export async function deleteSupervisor(id: string): Promise<void> {
  await apiClient.delete(`/supervisors/${id}`)
}
