import apiClient from '../lib/apiClient'
import type {
  TrackingWindow,
  CreateTrackingWindowRequest,
  UpdateTrackingWindowRequest,
  PaginatedResponse,
} from '../types'

export interface ListTrackingWindowParams {
  page?: number
  limit?: number
  paathashaala_id?: string
  is_active?: boolean
}

// GET /tracking-windows
export async function listTrackingWindows(
  params?: ListTrackingWindowParams,
): Promise<PaginatedResponse<TrackingWindow>> {
  const { data } = await apiClient.get<PaginatedResponse<TrackingWindow>>('/tracking-windows', {
    params,
  })
  return data
}

// GET /tracking-windows/:id
export async function getTrackingWindow(id: string): Promise<TrackingWindow> {
  const { data } = await apiClient.get<TrackingWindow>(`/tracking-windows/${id}`)
  return data
}

// POST /tracking-windows
export async function createTrackingWindow(
  payload: CreateTrackingWindowRequest,
): Promise<TrackingWindow> {
  const { data } = await apiClient.post<TrackingWindow>('/tracking-windows', payload)
  return data
}

// PATCH /tracking-windows/:id
export async function updateTrackingWindow(
  id: string,
  payload: UpdateTrackingWindowRequest,
): Promise<TrackingWindow> {
  const { data } = await apiClient.patch<TrackingWindow>(`/tracking-windows/${id}`, payload)
  return data
}

// DELETE /tracking-windows/:id
export async function deleteTrackingWindow(id: string): Promise<void> {
  await apiClient.delete(`/tracking-windows/${id}`)
}
