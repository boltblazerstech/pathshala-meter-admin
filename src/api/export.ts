import apiClient from '../lib/apiClient'
import type { ExportRequest } from '../types'

// POST /export
// Triggers an export of attendance / sync records for the given date range and optional user filter.
// Returns a CSV Blob response for direct download in the browser.
export async function downloadExportCsv(payload: ExportRequest): Promise<Blob> {
  const { data } = await apiClient.post<Blob>('/export', payload, {
    responseType: 'blob',
  })
  return data
}
