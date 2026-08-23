import apiClient from '../lib/apiClient'

export interface ReverseGeocodeResponse {
  address: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
  const { data } = await apiClient.get<ReverseGeocodeResponse>('/geocode/reverse', {
    params: { lat, lng }
  })
  return data
}
