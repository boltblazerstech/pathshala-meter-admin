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
  search?: string
  assigned_paathshaala_id?: string
  subject?: string
  is_active?: boolean
}

// GET /teachers
export async function listTeachers(
  params?: ListTeacherParams,
): Promise<PaginatedResponse<Teacher>> {
  const { data } = await apiClient.get<PaginatedResponse<Teacher>>('/teachers', { params })
  return data
}

// GET /teachers/:id
export async function getTeacher(id: string): Promise<Teacher> {
  const { data } = await apiClient.get<Teacher>(`/teachers/${id}`)
  return data
}

// POST /teachers
export async function createTeacher(payload: CreateTeacherRequest): Promise<Teacher> {
  const { data } = await apiClient.post<Teacher>('/teachers', payload)
  return data
}

// PATCH /teachers/:id
export async function updateTeacher(
  id: string,
  payload: UpdateTeacherRequest,
): Promise<Teacher> {
  const { data } = await apiClient.patch<Teacher>(`/teachers/${id}`, payload)
  return data
}

// DELETE /teachers/:id
export async function deleteTeacher(id: string): Promise<void> {
  await apiClient.delete(`/teachers/${id}`)
}
