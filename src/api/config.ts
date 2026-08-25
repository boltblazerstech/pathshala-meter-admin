import apiClient from '../lib/apiClient'

export async function getHealingInterval(): Promise<number> {
  const { data } = await apiClient.get<number>('/system-config/healing-interval')
  return data
}

export async function updateHealingInterval(minutes: number): Promise<void> {
  await apiClient.put('/system-config/healing-interval', minutes, {
    headers: { 'Content-Type': 'application/json' }
  })
}
