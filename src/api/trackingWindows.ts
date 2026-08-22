import apiClient from '../lib/apiClient'
import type {
  UserTrackingWindow,
  UpdateWindowRequest,
  BulkUpdateWindowRequest
} from '../types'

// GET /tracking-windows?date=YYYY-MM-DD
export async function listUserWindows(date: string): Promise<UserTrackingWindow[]> {
  const { data } = await apiClient.get<UserTrackingWindow[]>('/tracking-windows', {
    params: { date },
  })
  return data
}

// PUT /tracking-windows/:id
export async function updateUserWindow(
  userId: string,
  payload: UpdateWindowRequest,
): Promise<void> {
  await apiClient.put(`/tracking-windows/${userId}`, payload)
}

// POST /tracking-windows/bulk
export async function bulkUpdateWindows(payload: BulkUpdateWindowRequest): Promise<void> {
  await apiClient.post('/tracking-windows/bulk', payload)
}
