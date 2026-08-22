import apiClient from '../lib/apiClient'
import type {
  UserTrackingWindow,
  UpdateWindowRequest,
  BulkUpdateWindowRequest,
} from '../types'

// GET /tracking-windows?date=YYYY-MM-DD
export async function listUserWindows(date?: string): Promise<UserTrackingWindow[]> {
  const { data } = await apiClient.get<UserTrackingWindow[]>('/tracking-windows', {
    params: date ? { date } : undefined,
  })
  return data
}

// POST /tracking-windows
export async function createTrackingWindow(payload: {
  user_id: string
  start_time: string
  end_time: string
  interval_minutes: number
  effective_from_date: string
}): Promise<void> {
  const body = {
    user_id: payload.user_id,
    start_time: payload.start_time,
    end_time: payload.end_time,
    interval_minutes: payload.interval_minutes,
    effective_from_date: payload.effective_from_date,
  }
  await apiClient.post('/tracking-windows', body)
}

// PUT /tracking-windows/:id
export async function updateUserWindow(
  windowId: string,
  payload: UpdateWindowRequest,
): Promise<void> {
  const body = {
    start_time: payload.start_time,
    end_time: payload.end_time,
    interval_minutes: payload.interval_minutes,
    effective_from_date: payload.effective_from_date || payload.effective_from,
  }
  await apiClient.put(`/tracking-windows/${windowId}`, body)
}

// POST /tracking-windows/bulk
export async function bulkUpdateWindows(payload: BulkUpdateWindowRequest): Promise<void> {
  const body = {
    user_ids: payload.user_ids,
    start_time: payload.start_time,
    end_time: payload.end_time,
    interval_minutes: payload.interval_minutes,
    effective_from_date: payload.effective_from_date || payload.effective_from,
  }
  await apiClient.post('/tracking-windows/bulk', body)
}
