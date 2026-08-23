/**
 * Formats a raw distance in meters into a human-readable string:
 * - < 1km: Rounded to nearest 10 meters (e.g. 150 m)
 * - >= 1km: Displayed in kilometers with 1 decimal place (e.g. 1.3 km)
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '—'
  
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  
  const rounded = Math.round(meters / 10) * 10
  return `${rounded} m`
}
