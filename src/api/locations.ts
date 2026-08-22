import apiClient from '../lib/apiClient'
import type { LiveViewResponse } from '../types'

export interface LiveViewParams {
  paathashaalaId?: string
  windowId?: string
}

// GET /locations/live
// Returns the latest ping per teacher within currently-active tracking windows.
// React Query is wired to refetch this on an interval for the Live View feature.
export async function getLiveView(params?: LiveViewParams): Promise<LiveViewResponse> {
  const { data } = await apiClient.get<LiveViewResponse>('/locations/live', { params })
  return data
}
