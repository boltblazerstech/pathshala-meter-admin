import apiClient from '../lib/apiClient'

export async function getHealingInterval(): Promise<number> {
  const { data } = await apiClient.get<any>('/system-config/healing-interval')
  if (typeof data === 'number') return data
  if (typeof data === 'string') return parseInt(data, 10)
  if (data && typeof data === 'object') {
    return data.interval ?? data.value ?? data.healingInterval ?? data.healing_interval ?? Number(Object.values(data)[0])
  }
  return data
}

export async function updateHealingInterval(minutes: number): Promise<void> {
  await apiClient.put('/system-config/healing-interval', minutes, {
    headers: { 'Content-Type': 'application/json' }
  })
}
