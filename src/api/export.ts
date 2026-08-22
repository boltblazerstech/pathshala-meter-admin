import apiClient from '../lib/apiClient'
import type { ExportRequest, ExportResponse } from '../types'

// POST /export
// Triggers a server-side export job and returns a signed download URL.
export async function requestExport(payload: ExportRequest): Promise<ExportResponse> {
  const { data } = await apiClient.post<ExportResponse>('/export', payload)
  return data
}
