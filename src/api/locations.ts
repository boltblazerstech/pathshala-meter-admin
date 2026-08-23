import apiClient from '../lib/apiClient'
import type { LiveSyncResponse, DistanceLookupResponse } from '../types'

// TODO [3f]: GET /api/admin/locations/live — returns LiveSyncResponse
// This is the primary endpoint for the Live View page.
// Returns every active supervisor + teacher with their last-known
// coordinates, last_synced_at timestamp, and sync_status.
export async function getLiveSync(): Promise<LiveSyncResponse> {
  const { data } = await apiClient.get<LiveSyncResponse>('/locations/live')
  return data
}

// TODO [3f]: GET /api/admin/locations/distance?user_id=X&paathashaala_id=Y
// Called when an admin selects a paathshaala for a supervisor row,
// or automatically for teachers (fixed assignment).
// Returns the Haversine distance in meters and whether it's within 200m range.
export async function getDistanceLookup(
  userId: string,
  paathashaalaId: string,
): Promise<DistanceLookupResponse> {
  const { data } = await apiClient.get<DistanceLookupResponse>('/locations/distance', {
    params: { user_id: userId, paathashaala_id: paathashaalaId },
  })
  return data
}

// POST /api/admin/locations/request/{userId}
export async function requestLocationUpdate(userId: string): Promise<void> {
  await apiClient.post(`/locations/request/${userId}`)
}
