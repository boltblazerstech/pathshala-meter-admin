import apiClient from '../lib/apiClient'
import type {
  Teacher,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  PaginatedResponse,
} from '../types'

export interface ListTeacherParams {
  page?: number
  limit?: number
  size?: number
  search?: string
  assigned_paathshaala_id?: string
  subject?: string
  is_active?: boolean
}

// GET /teachers
export async function listTeachers(
  params?: ListTeacherParams,
): Promise<PaginatedResponse<Teacher>> {
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

  const { data } = await apiClient.get<PaginatedResponse<Teacher>>('/teachers', { params: queryParams })
  return data
}

// GET /teachers/:id
export async function getTeacher(id: string): Promise<Teacher> {
  const { data } = await apiClient.get<Teacher>(`/teachers/${id}`)
  return data
}

// POST /teachers
export async function createTeacher(payload: CreateTeacherRequest): Promise<Teacher> {
  const paathshaalaId = payload.paathshaala_id || payload.assigned_paathshaala_id
  const body: Record<string, any> = {
    name: payload.name,
    phone_number: payload.phone_number || payload.phone,
    phone: payload.phone || payload.phone_number,
    paathshaala_id: paathshaalaId,
    assigned_paathshaala_id: paathshaalaId,
  }
  if (payload.password) body.password = payload.password

  const { data } = await apiClient.post<Teacher>('/teachers', body)
  return data
}

// PUT or PATCH /teachers/:id
export async function updateTeacher(
  id: string,
  payload: UpdateTeacherRequest,
): Promise<Teacher> {
  const paathshaalaId = payload.paathshaala_id || payload.assigned_paathshaala_id
  const body: Record<string, any> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.phone_number !== undefined || payload.phone !== undefined) {
    body.phone_number = payload.phone_number || payload.phone
    body.phone = payload.phone || payload.phone_number
  }
  if (payload.password) body.password = payload.password
  if (paathshaalaId !== undefined) {
    body.paathshaala_id = paathshaalaId
    body.assigned_paathshaala_id = paathshaalaId
  }
  if (payload.active !== undefined || payload.is_active !== undefined) {
    body.active = payload.active ?? payload.is_active
    body.is_active = payload.is_active ?? payload.active
  }

  // Support both PUT (Spring backend) and PATCH
  try {
    const { data } = await apiClient.put<Teacher>(`/teachers/${id}`, body)
    return data
  } catch (err: any) {
    if (err.response?.status === 405) {
      const { data } = await apiClient.patch<Teacher>(`/teachers/${id}`, body)
      return data
    }
    throw err
  }
}

// DELETE /teachers/:id
export async function deleteTeacher(id: string): Promise<void> {
  await apiClient.delete(`/teachers/${id}`)
}
