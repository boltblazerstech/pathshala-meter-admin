import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHealingInterval, updateHealingInterval } from '../../api/config'
import { toast } from '../../lib/toast'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [interval, setIntervalVal] = useState<number | string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['system-config', 'healing-interval'],
    queryFn: getHealingInterval,
  })

  useEffect(() => {
    if (data !== undefined) {
      setIntervalVal(data)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (val: number) => updateHealingInterval(val),
    onSuccess: () => {
      toast.success('Healing check interval updated')
      queryClient.invalidateQueries({ queryKey: ['system-config', 'healing-interval'] })
    },
    onError: () => {
      toast.error('Failed to update healing interval')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(interval)
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid positive number')
      return
    }
    updateMutation.mutate(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-700">System Settings</h2>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 max-w-2xl">
        <h3 className="text-md font-medium text-gray-800 mb-4">Background Services</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="healing-interval" className="block text-sm font-medium text-gray-700 mb-1">
              Healing Check Interval (minutes)
            </label>
            <div className="flex gap-3 items-center">
              <input
                id="healing-interval"
                type="number"
                min="1"
                required
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                disabled={isLoading || updateMutation.isPending}
                className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || updateMutation.isPending || interval === data}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Determines how frequently the mobile app checks for missed tracking periods to heal data.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
